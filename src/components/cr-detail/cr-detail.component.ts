import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CrApiService } from '../../api/cr-api.service';
import { SessionService } from '../../session/session.service';
import { CrDetail, TimelineEntry } from '../../models/cr.models';
import { idle, loading, ViewState } from '../../common/view-state';
import { computeDiff, DiffRow } from '../diff.util';
import { formatMoney } from '../../common/money.util';
import { canApprovePolicy } from '../../common/permissions';

/**
 * Change Request DETAIL page: loads a CR and renders the diff/preview, the approval timeline, and
 * permission-aware Approve/Reject actions. `load`, the diff binding, and the template skeleton are
 * provided; the timeline ordering, permission gating, actions, and reject validation are yours.
 */
@Component({
	selector: 'app-cr-detail',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule],
	templateUrl: './cr-detail.component.html',
})
export class CrDetailComponent implements OnChanges {
	@Input() id!: string;
	@Output() updated = new EventEmitter<void>();

	state: ViewState<CrDetail> = idle();
	submitting = false;
	actionError?: string;
	private loadVersion = 0;
	rejectControl = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] });

	constructor(private readonly api: CrApiService, private readonly session: SessionService) {}

	ngOnChanges(): void {
		this.rejectControl.reset('');
		void this.load();
	}

	async load(): Promise<void> {
		const version = ++this.loadVersion;
		this.state = loading();
		this.actionError = undefined;
		try {
			const detail = await this.api.getChangeRequest(this.session.user, this.id);
			if (version !== this.loadVersion) return;
			this.state = { status: 'loaded', data: detail };
		} catch (err) {
			if (version !== this.loadVersion) return;
			this.state = { status: 'error', data: null, error: (err as Error).message };
		}
	}

	get detail(): CrDetail | null {
		return this.state.data;
	}

	get diff(): DiffRow[] {
		return this.detail ? computeDiff(this.detail.baselineLineItems, this.detail.proposedLineItems) : [];
	}

	/** Approval timeline, oldest-first. */
	get timeline(): TimelineEntry[] {
		const auditDetails = this.detail?.audit ?? [];
		return [...auditDetails].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
	}

	/** Whether the current user may approve the loaded CR. */
	get canApprove(): boolean {
		return this.detail?.status === 'PENDING_APPROVAL' && canApprovePolicy(this.session.user);
	}

	get canReject(): boolean {
		return this.canApprove;
	}

	fmt(amount: number): string {
		return this.detail ? formatMoney(amount, this.detail.currency) : String(amount);
	}

	async approve(): Promise<void> {
		if (!this.canApprove || this.submitting) return;
		const version = this.loadVersion;
		this.submitting = true;
		this.actionError = undefined;

		try {
			const detail = await this.api.approve(this.session.user, this.id, new Date().toISOString());
			if (version === this.loadVersion) {
				this.state = { status: 'loaded', data: detail };
			}
			this.updated.emit();
		} catch (err) {
			if (version === this.loadVersion) {
				this.actionError = (err as Error).message;
			}
		} finally {
			this.submitting = false;
		}
	}

	async reject(): Promise<void> {
		if (!this.canReject || this.submitting) return;

		this.rejectControl.markAsTouched();
		if (this.rejectControl.invalid) return;
		const version = this.loadVersion;
		this.submitting = true;
		this.actionError = undefined;

		try {
			const detail = await this.api.reject(this.session.user, this.id, new Date().toISOString(), this.rejectControl.value.trim());
			if (version === this.loadVersion) {
				this.state = { status: 'loaded', data: detail };
			}
			this.updated.emit();
		} catch (err) {
			if (version === this.loadVersion) {
				this.actionError = (err as Error).message;
			}
		} finally {
			this.submitting = false;
		}
	}
}
