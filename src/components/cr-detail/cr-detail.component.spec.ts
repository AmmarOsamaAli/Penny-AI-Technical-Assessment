import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrApiService } from '../../api/cr-api.service';
import { CrDetailComponent } from './cr-detail.component';
import { SessionService } from '../../session/session.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser, id: string): Promise<ComponentFixture<CrDetailComponent>> {
	TestBed.configureTestingModule({
		imports: [CrDetailComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrDetailComponent);
	fixture.componentRef.setInput('id', id);
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded state
	return fixture;
}

describe('CrDetailComponent', () => {
	it('loads and renders the change request title', async () => {
		const fixture = await render(users.approver, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
	});

	it('disables Approve for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-1'); // viewer: cr_r_o only; CR-1 is PENDING_APPROVAL
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(true);
	});

	it('renders the timeline oldest first', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const element: HTMLElement = fixture.nativeElement;
		const actions = Array.from(element.querySelectorAll('.cr-timeline__action'), (entry) => entry.textContent?.trim());

		expect(actions).toEqual(['CREATE', 'SUBMIT', 'SEND_FOR_APPROVAL']);
	});

	it('shows details and hides Reject for a viewer', async () => {
		const fixture = await render(users.viewer, 'CR-1');
		const element: HTMLElement = fixture.nativeElement;

		expect(element.querySelector('.cr-detail__header h2')?.textContent).toContain('Add 1 unit of SKU-A');
		expect(element.querySelector('.cr-actions__reject')).toBeNull();
	});

	it('enables actions for an authorized user in another org', async () => {
		const fixture = await render(users.otherOrg, 'CR-9');
		const element: HTMLElement = fixture.nativeElement;
		const approve = element.querySelector<HTMLButtonElement>('.cr-actions__approve');

		if (!approve) throw new Error('Approve button not found');

		expect(approve.disabled).toBe(false);
		expect(element.querySelector('.cr-actions__reject')).not.toBeNull();
	});

	it.each(['CR-2', 'CR-3'])('prevents actions on non-pending request %s', async (id) => {
		const fixture = await render(users.approver, id);
		const element: HTMLElement = fixture.nativeElement;
		const approve = element.querySelector<HTMLButtonElement>('.cr-actions__approve');

		if (!approve) throw new Error('Approve button not found');

		expect(approve.disabled).toBe(true);
		expect(element.querySelector('.cr-actions__reject')).toBeNull();
	});

	it('reloads details and clears the reason when the request changes', async () => {
		const fixture = await render(users.approver, 'CR-1');
		fixture.componentInstance.rejectControl.setValue('Previous reason');

		fixture.componentRef.setInput('id', 'CR-2');
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();

		const element: HTMLElement = fixture.nativeElement;
		expect(element.querySelector('.cr-detail__header h2')?.textContent).toContain('Replace SKU-B supplier');
		expect(fixture.componentInstance.rejectControl.value).toBe('');
	});

	it.each(['', '   '])('blocks rejection with a blank reason %j', async (reason) => {
		const fixture = await render(users.approver, 'CR-1');
		const rejectSpy = jest.spyOn(TestBed.inject(CrApiService), 'reject');

		fixture.componentInstance.rejectControl.setValue(reason);
		fixture.detectChanges();

		const element: HTMLElement = fixture.nativeElement;
		const button = element.querySelector<HTMLButtonElement>('.cr-actions__reject-btn');
		if (!button) throw new Error('Reject button not found');

		expect(button.disabled).toBe(true);

		await fixture.componentInstance.reject();
		fixture.detectChanges();

		expect(rejectSpy).not.toHaveBeenCalled();
		expect(element.querySelector('.cr-actions__reason-error')?.textContent).toContain('Please enter a reason.');
	});

	it('approves a request and displays the updated status and timeline', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const element: HTMLElement = fixture.nativeElement;
		const updatedSpy = jest.spyOn(fixture.componentInstance.updated, 'emit');
		const button = element.querySelector<HTMLButtonElement>('.cr-actions__approve');
		if (!button) throw new Error('Approve button not found');

		button.click();
		await fixture.whenStable();
		fixture.detectChanges();

		expect(element.querySelector('.cr-status')?.textContent).toBe('APPROVED');
		expect(element.querySelector('.cr-timeline__list')?.textContent).toContain('APPROVE');
		expect(button.disabled).toBe(true);
		expect(updatedSpy).toHaveBeenCalledTimes(1);
	});

	it('rejects a request and displays the submitted reason', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const element: HTMLElement = fixture.nativeElement;
		const rejectSpy = jest.spyOn(TestBed.inject(CrApiService), 'reject');
		const updatedSpy = jest.spyOn(fixture.componentInstance.updated, 'emit');
		const textarea = element.querySelector<HTMLTextAreaElement>('.cr-actions__reason');
		if (!textarea) throw new Error('Reason field not found');

		textarea.value = '  Incorrect quantity  ';
		textarea.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		const button = element.querySelector<HTMLButtonElement>('.cr-actions__reject-btn');
		if (!button) throw new Error('Reject button not found');

		expect(button.disabled).toBe(false);
		button.click();
		await fixture.whenStable();
		fixture.detectChanges();

		expect(rejectSpy).toHaveBeenCalledWith(users.approver, 'CR-1', expect.any(String), 'Incorrect quantity');
		expect(element.querySelector('.cr-status')?.textContent).toBe('REJECTED');
		expect(element.querySelector('.cr-timeline__note')?.textContent).toContain('Incorrect quantity');
		expect(element.querySelector('.cr-actions__reject')).toBeNull();
		expect(updatedSpy).toHaveBeenCalledTimes(1);
	});

	it.each(['approve', 'reject'] as const)('blocks duplicate %s actions while waiting', async (action) => {
		const fixture = await render(users.approver, 'CR-1');
		const api = TestBed.inject(CrApiService);
		api.latencyMs = 10;
		const spy = jest.spyOn(api, action);
		fixture.componentInstance.rejectControl.setValue('Incorrect quantity');

		const pending = fixture.componentInstance[action]();
		fixture.detectChanges();

		const element: HTMLElement = fixture.nativeElement;
		const buttons = element.querySelectorAll<HTMLButtonElement>('.cr-actions button');
		expect(buttons.length).toBe(2);
		expect(Array.from(buttons).every((button) => button.disabled)).toBe(true);

		await fixture.componentInstance[action]();
		expect(spy).toHaveBeenCalledTimes(1);

		await pending;
		fixture.detectChanges();
		expect(fixture.componentInstance.submitting).toBe(false);
	});

	it.each(['approve', 'reject'] as const)('shows an error and restores controls when %s fails', async (action) => {
		const fixture = await render(users.approver, 'CR-1');
		const api = TestBed.inject(CrApiService);
		const before = await api.getChangeRequest(users.approver, 'CR-1');
		api.failNext = true;
		fixture.componentInstance.rejectControl.setValue('Incorrect quantity');
		const updatedSpy = jest.spyOn(fixture.componentInstance.updated, 'emit');

		await fixture.componentInstance[action]();
		fixture.detectChanges();

		const element: HTMLElement = fixture.nativeElement;
		expect(element.querySelector('.cr-actions__error')?.textContent).toContain('Network error');
		expect(element.querySelector('.cr-status')?.textContent).toBe('PENDING_APPROVAL');
		expect(updatedSpy).not.toHaveBeenCalled();

		const buttons = element.querySelectorAll<HTMLButtonElement>('.cr-actions button');
		expect(buttons.length).toBe(2);
		expect(Array.from(buttons).every((button) => !button.disabled)).toBe(true);
		const after = await api.getChangeRequest(users.approver, 'CR-1');
		expect(after.status).toBe(before.status);
		expect(after.audit).toEqual(before.audit);
	});

	it('shows loading before displaying the details', async () => {
		TestBed.configureTestingModule({
			imports: [CrDetailComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }],
		});
		await TestBed.compileComponents();

		TestBed.inject(CrApiService).latencyMs = 10;
		const fixture = TestBed.createComponent(CrDetailComponent);
		fixture.componentRef.setInput('id', 'CR-1');
		fixture.detectChanges();

		const element: HTMLElement = fixture.nativeElement;
		expect(element.querySelector('.cr-detail__loading')).not.toBeNull();
		expect(element.querySelector('.cr-detail__header')).toBeNull();

		await fixture.whenStable();
		fixture.detectChanges();

		expect(element.querySelector('.cr-detail__loading')).toBeNull();
		expect(element.querySelector('.cr-detail__header h2')?.textContent).toContain('Add 1 unit of SKU-A');
	});

	it('shows a detail fetch error and recovers through Retry', async () => {
		const fixture = await render(users.approver, 'CR-1');
		TestBed.inject(CrApiService).failNext = true;

		await fixture.componentInstance.load();
		fixture.detectChanges();

		const element: HTMLElement = fixture.nativeElement;
		expect(element.querySelector('.cr-detail__error')?.textContent).toContain('Network error');
		expect(element.querySelector('.cr-detail__header')).toBeNull();

		const retry = element.querySelector<HTMLButtonElement>('.cr-detail__error button');
		if (!retry) throw new Error('Retry button not found');

		retry.click();
		fixture.detectChanges();
		expect(element.querySelector('.cr-detail__loading')).not.toBeNull();

		await fixture.whenStable();
		fixture.detectChanges();

		expect(element.querySelector('.cr-detail__error')).toBeNull();
		expect(element.querySelector('.cr-detail__header h2')?.textContent).toContain('Add 1 unit of SKU-A');
	});

	it('ignores an older load response after selecting another request', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const api = TestBed.inject(CrApiService);

		api.latencyMs = 30;
		const olderLoad = fixture.componentInstance.load();

		api.latencyMs = 0;
		fixture.componentRef.setInput('id', 'CR-2');
		fixture.detectChanges();

		await olderLoad;
		await fixture.whenStable();
		fixture.detectChanges();

		const element: HTMLElement = fixture.nativeElement;
		expect(element.querySelector('.cr-detail__header h2')?.textContent).toContain('Replace SKU-B supplier');
	});
});
