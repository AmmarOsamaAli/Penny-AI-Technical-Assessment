## 1. What I changed

### **Task 1:**

- *The **diff/preview** misclassifies a changed line item (`diff.spec.ts`):* The test failes here becasue, in `diff.util.ts`, we only classified a change request as changed only if the unit price of the baseline value has changed, but a change request is also considered as 'changed' if the quantity changes as well. So instead of having this line of code: **(const changed = b.unitPrice !== p.unitPrice)**, we also add the comparsion for the quantity change like this **(const changed = b.unitPrice !== p.unitPrice || b.quantity !== p.quantity;)**
- *The **detail** page enables Approve for a user who isn't permitted (`cr-detail.component.spec.ts`):* In the `cr-detail.componenet.ts`, the canApprove() function only considers that, we can approve if the change request is pending-approval, but it doesn't consider the user role whether it is an approver or viewer. So, we have to check if the current user is an approver, only then we enable the button, otherwise it is disabled. Before implementing this, the canApprove() function only returned this: **return this.detail?.status === 'PENDING_APPROVAL';**, but now that we have to check the user as well, canApprove needs to check both `PENDING_APPROVAL` status and `canApprovePolicy(this.session.user)`. canReject uses the same condition, so permission depends on policies rather than a specific user.


### **Task 2:**

- *implement the **status filter** so `visibleRows` (and the rendered table) narrows by status:* Before implemeting this, changing the status filter didn't show the appropriate change requests, and so we had to fix it. So in the `cr-list.componenet.ts` I implemented this as follows: first of all, the rows variable will return all change requests data, and so in order to show the appropriate change request based on the status choosen we have to **'filter'** the change requests based on the choosen status filter. so the first thing is, I created an if statement to show all change requests if the status filter is set to 'ALL', **otherwise**, it will filter the rows variable so that it stores into a new array only the change requests where the status of the object equals the status filter. this way it will only show the appropriate change requests based on the status filter.
- *the loading / loaded / empty / error states are wired — keep them correct:* When a change request status is not the same as the status filter, the list is empty but it doesn't show any messages, so in the `cr-list.componenet.html`, in the paragraph where it is set to show "No change requests to show," i added **"|| visibleRows.length == 0"** so that it shows the message if the list is empty or if there is an error. also in the table, the table headers will show if **"visibleRows.length > 0"**, so now the headers will not show as well if the list is empty. This provides a better user expierence.
   

### **Task 3:**

- *the **diff/preview panel** (added / removed / changed / unchanged rows, with totals and delta):* No additional component or template changes were needed for this part. I reused the existing preview template; the quantity-change classification defect was fixed in Task 1.
- *the **approval timeline**, rendered **chronologically:*** For this part of the details pane, I implemented it using the sort function. Since each timeline entry’s `at` contains its date, I used getTime() to convert that date into a number, and then subtracted b’s timestamp from a’s timestamp to order them from oldest to latest. 
- *permission-aware action visibility: whether Approve/Reject are offered/enabled must respect both the CR's status and the user's policies:* previously I had a mistake where I checked the user ID with 'mona', I replaced that with `canApprovePolicy(this.session.user)`, so that approval depends on the user's policies instead of a specific user. It also checks that the change request status is **"PENDING_APPROVAL"**. The template uses this result to disable the Approve button if the user is not permitted. `canReject` uses the same permission and status check as `canApprove`.
- *Approve / Reject actions that call the API and behave correctly on a slow or failing response:* In approve() and reject(), I replaced the “not implemented” errors with calls to the provided API. I added submitting so that the buttons are disabled while waiting for a response and repeated clicks cannot send another action. If the action succeeds, the detail pane updates and updated.emit() reloads the list, so both panes show the new status. If it fails, actionError shows the error message, and finally resets submitting so the user can try again. I added version checks to prevent older responses from replacing the current selection, and corrected the mock API so failed actions leave stored data unchanged.
- *Reject reason validation: a reason is required before Reject can proceed:* In `rejectControl`, I added `Validators.required` and `Validators.pattern(/\S/)`, so that the reason cannot be empty or contain only spaces. The template disables Reject while the reason is invalid. In `reject()`, I also check the validation before calling the API and use `.trim()` to remove spaces from the beginning and end of the submitted reason.


### **Task 4:**

- *Role/permission-aware + UX states:* The read-only user can see the request data, but Approve is disabled and Reject is hidden because both actions check the request status and the user’s policies. In `cr-list.component.html`, I updated the empty-message condition so that it only appears when there are no requests or no matching filtered rows, instead of also appearing during loading or errors. The existing templates show loading messages, error messages, and Retry buttons. I also replaced `ngOnInit()` with `ngOnChanges()` in the detail component so that clicking another request updates the right pane, and reset the rejection reason when switching requests.

### **Task 5:**

- *Add your own tests (component/DOM where relevant):* I added tests for the status filter, switching back to ALL, and showing the empty message when no requests match. I also tested loading, errors, and Retry for both screens. For the detail pane, I added tests for chronological timeline ordering, user permissions, switching requests, Approve/Reject success, duplicate actions during slow responses, failed actions, and rejection reason validation. In `diff.spec.ts`, I added price-only changes and unchanged items. Also I added a test to check that an older load response cannot replace the newly selected request, and extended the action failure tests to confirm that the stored status and audit history remain unchanged after failure. All 30 tests passed, along with type checking, lint, and the production build.


## 2. Component & state model

- The app consists of two main panels: one with a list of change requests and a filter for status , and a details panel that shows the proposed changes, totals, approval timeline and action controls for the selected change request.

- The parent component holds the selected request ID and passes it to the detail component, and SessionService holds the current user. The detail component tracks action submission, action errors and rejection reason separately.

- Data is pulled from the provided mock API. The availability of actions should depend on the status of the request and the permissions of the user. 


## 3. Invariants I keep

| Invariant | How / where |
| --------- | ----------- |
| Actions require permission and a pending request. | `canApprove` checks the status and user policies, and `canReject` uses the same check. Both action methods also check before calling the API. |
| Repeated clicks cannot submit another action while waiting. | `submitting` disables the buttons and prevents another API call until the current action finishes. |
| Reject requires a reason containing actual text. | `rejectControl` uses required and whitespace validation, and `reject()` checks validity before submitting. |
| Filtering does not remove the original requests. | `visibleRows` returns a filtered array while keeping `state.data` unchanged. |
| The timeline is oldest first without changing the original audit array. | The timeline getter copies the entries before sorting by their timestamps. |
| Empty messages do not appear during loading or errors. | The list template checks the view status before showing the empty message. |
| Successful actions update both panes. | The detail pane uses the API response and emits `updated` so the list reloads. |
| Selecting another request updates its details. | `ngOnChanges()` reloads the request and clears the previous rejection reason. |
| Older responses cannot overwrite the current selection. | Version checks run after asynchronous loads and before action results update the detail state. |
| Failed actions leave stored request data unchanged. | The mock API commits the updated request only after the response succeeds. |


## 4. Testing strategy

- I used component/DOM tests to check what the user actually sees, such as filtered rows, disabled buttons, hidden actions, messages, and timeline ordering. I used pure function tests for the diff because it compares arrays without needing Angular components. Slow responses and failures were tested using the mock API’s latencyMs and failNext settings. Given the time budget, I focused on the required behavior and edge cases instead of a coverage number, and did not add browser automation or tests for every possible combination of statuses and policies.

## 5. Assumptions

- I used the provided approval policy helper for both Approve and Reject because the scaffold does not provide a separate rejection policy.
- I kept Approve visible but disabled for unauthorized users, while Reject is hidden. This follows the supplied test and prevents read-only users from acting. 
- I kept the fetch state separate from filtered results. If requests were loaded but none match the filter, the state stays loaded and the template shows the empty message.
- I treated a whitespace-only rejection reason as invalid and trimmed the reason before submitting it.
- I kept the diff comparison focused on quantity and unit price. Description-only changes are not currently classified as changed.
- I made a small correction to the provided mock API’s failure behavior while keeping its public methods and response shapes unchanged.

## 6. Where I used AI

- After reading the README and reviewing the files for Task 0, I used AI to help bring the project structure together and clarify how the components, services, models, and templates connect. When I got stuck, particularly in Task 3, I used it to discuss permission checks, action submission, error handling, and rejection validation. It also provided implementation examples that I applied and reviewed. For testing, I used AI to help identify meaningful edge cases, combine similar cases into parameterized tests, and avoid duplicate checks. I made the changes in the project and verified them by running the tests, type checking, lint, and build. 

## 7. What I'd improve with more time

- I would improve submission feedback with a visible “Approving…” or “Rejecting…” message.
- I would expand the preview to show description changes and add tests for them.
- I would add an integration test that checks the full connection between the list and detail panes after an action, and improve keyboard access for selecting table rows.
