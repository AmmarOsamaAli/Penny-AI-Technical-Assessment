import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrApiService } from '../../api/cr-api.service';
import { CrListComponent } from './cr-list.component';
import { SessionService } from '../../session/session.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser): Promise<ComponentFixture<CrListComponent>> {
	TestBed.configureTestingModule({
		imports: [CrListComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrListComponent);
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded/empty state
	return fixture;
}

describe('CrListComponent', () => {
	it('renders a row per change request in the user org', async () => {
		const fixture = await render(users.approver);
		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(3); // org-alpha: CR-1, CR-2, CR-3
	});

	it('shows the empty state when the org has no change requests', async () => {
		const fixture = await render({ id: 'x', orgCode: 'org-empty', policies: ['cr_r_o'] });
		expect(fixture.nativeElement.querySelector('.cr-list__empty')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-list__table')).toBeNull();
	});

	it('filters rendered rows by status and restores all rows', async () => {
		const fixture = await render(users.approver);
		const element: HTMLElement = fixture.nativeElement;
		const select = element.querySelector<HTMLSelectElement>('.cr-list__filter');

		if (!select) throw new Error('Status dropdown not found');

		select.value = 'APPLIED';
		select.dispatchEvent(new Event('change'));
		fixture.detectChanges();

		const rows = element.querySelectorAll('.cr-list__row');
		expect(rows.length).toBe(1);
		expect(rows[0].textContent).toContain('CR-2');

		select.value = 'ALL';
		select.dispatchEvent(new Event('change'));
		fixture.detectChanges();

		expect(element.querySelectorAll('.cr-list__row').length).toBe(3);
	});

	it('shows an empty message when no requests match the filter', async () => {
		const fixture = await render(users.approver);
		const element: HTMLElement = fixture.nativeElement;
		const select = element.querySelector<HTMLSelectElement>('.cr-list__filter');

		if (!select) throw new Error('Status dropdown not found');

		select.value = 'REJECTED';
		select.dispatchEvent(new Event('change'));
		fixture.detectChanges();

		expect(element.querySelector('.cr-list__empty')?.textContent).toContain('No change requests to show.');
		expect(element.querySelector('.cr-list__table')).toBeNull();
		expect(element.querySelector('.cr-list__loading')).toBeNull();
		expect(element.querySelector('.cr-list__error')).toBeNull();
	});

	it('shows loading without an empty message while waiting', async () => {
		TestBed.configureTestingModule({
			imports: [CrListComponent],
			providers: [{ provide: SessionService, useValue: { user: users.approver } }],
		});
		await TestBed.compileComponents();

		TestBed.inject(CrApiService).latencyMs = 10;
		const fixture = TestBed.createComponent(CrListComponent);
		fixture.detectChanges();

		const element: HTMLElement = fixture.nativeElement;
		expect(element.querySelector('.cr-list__loading')).not.toBeNull();
		expect(element.querySelector('.cr-list__empty')).toBeNull();
		expect(element.querySelector('.cr-list__table')).toBeNull();

		await fixture.whenStable();
		fixture.detectChanges();

		expect(element.querySelector('.cr-list__loading')).toBeNull();
		expect(element.querySelectorAll('.cr-list__row').length).toBe(3);
	});

	it('shows a fetch error and reloads when Retry is clicked', async () => {
		const fixture = await render(users.approver);
		const element: HTMLElement = fixture.nativeElement;

		TestBed.inject(CrApiService).failNext = true;
		await fixture.componentInstance.load();
		fixture.detectChanges();

		expect(element.querySelector('.cr-list__error')?.textContent).toContain('Network error');
		expect(element.querySelector('.cr-list__empty')).toBeNull();
		expect(element.querySelector('.cr-list__table')).toBeNull();

		const retry = element.querySelector<HTMLButtonElement>('.cr-list__error button');
		if (!retry) throw new Error('Retry button not found');

		retry.click();
		fixture.detectChanges();
		expect(element.querySelector('.cr-list__loading')).not.toBeNull();

		await fixture.whenStable();
		fixture.detectChanges();

		expect(element.querySelector('.cr-list__error')).toBeNull();
		expect(element.querySelectorAll('.cr-list__row').length).toBe(3);
	});
});
