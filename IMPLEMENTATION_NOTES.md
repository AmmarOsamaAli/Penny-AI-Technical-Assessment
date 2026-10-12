# Implementation Notes

> Fill this in as part of your submission. 1–2 pages, bullet points are fine. Delete these
> instructions before submitting.

## 1. What I changed

<!-- Grouped by task: bugs fixed and features implemented (component + template). -->

### **Task 1:**

- *The **diff/preview** misclassifies a changed line item (`diff.spec.ts`):* The test failes here becasue, in `diff.util.ts`, we only classified a change request as changed only if the quantity of the baseline value has changed, but a change request is also considered as 'changed' if the quantity changes as well. So instead of having this line of code: **(const changed = b.unitPrice !== p.unitPrice)**, we also add the comparsion for the quantity change like this **(const changed = b.unitPrice !== p.unitPrice || b.quantity !== p.quantity;)**
- *The **detail** page enables Approve for a user who isn't permitted (`cr-detail.component.spec.ts`):* In the `cr-detail.componenet.ts`, the canApprove() function only considers that, we can approve if the change request is pending-approval, but it doesn't consider the user role whether it is an approver or viewer. So, we have to check if the current user is an approver, only then we enable the button, otherwise it is disabled. Before implementing this, the canApprove() function only returned this: **return this.detail?.status === 'PENDING_APPROVAL';**, but now that we have to check the user as well, the function should return this: **return this.detail?.status === 'PENDING_APPROVAL' && this.session.user.id === 'mona';**. This should also be implemented for the canReject function, but since you didn't ask I will not modify the code.


### **Task 2:**

- *implement the **status filter** so `visibleRows` (and the rendered table) narrows by status:* Before implemeting this, changing the status filter didn't show the appropriate change requests, and so we had to fix it. So in the `cr-list.componenet.ts` I implemented this as follows: first of all, the rows variable will return all change requests data, and so in order to show the appropriate change request based on the status choosen we have to **'filter'** the change requests based on the choosen status filter. so the first thing is, I created an if statement to show all change requests if the status filter is set to 'ALL', **otherwise**, it will filter the rows variable so that it stores into a new array only the change requests where the status of the object equals the status filter. this way it will only show the appropriate change requests based on the status filter.
- *the loading / loaded / empty / error states are wired — keep them correct:* When a change request status is not the same as the status filter, the list is empty but it doesn't show any messages, so in the `cr-list.componenet.html`, in the paragraph where it is set to show "No change requests to show," i added **"|| visibleRows.length == 0"** so that it shows the message if the list is empty or if there is an error. also in the table, the table headers will show if **"visibleRows.length > 0"**, so now the headers will not show as well if the list is empty. This provides a better user expierence.
   

### **Task 3:**

- *the **diff/preview panel** (added / removed / changed / unchanged rows, with totals and delta):* No additional component or template changes were needed for this part. Everything is already working perfectly
- *the **approval timeline**, rendered **chronologically:*** For this part of the details pane, I implemented it using the sort function. Since each timeline entry’s `at` contains its date, I used getTime() to convert that date into a number, and then subtracted number a from number b to order them from oldest to latest. 
- *permission-aware action visibility: whether Approve/Reject are offered/enabled must respect both the CR's status and the user's policies:* previously I had a mistake where I checked the user ID with 'mona', I replaced that with `canApprovePolicy(this.session.user)`, so that approval depends on the user's policies instead of a specific user. It also checks that the change request status is **"PENDING_APPROVAL"**. The template uses this result to disable the Approve button if the user is not permitted. Reject still needs the same permission check in canReject.
- *Approve / Reject actions that call the API and behave correctly on a slow or failing response:* In approve() and reject(), I replaced the “not implemented” errors with calls to the provided API. I added submitting so that the buttons are disabled while waiting for a response and repeated clicks cannot send another action. If the action succeeds, the detail pane updates and updated.emit() reloads the list, so both panes show the new status. If it fails, actionError shows the error message, and finally resets submitting so the user can try again.
- *Reject reason validation: a reason is required before Reject can proceed:* In `rejectControl`, I added `Validators.required` and `Validators.pattern(/\S/)`, so that the reason cannot be empty or contain only spaces. The template disables Reject while the reason is invalid. In `reject()`, I also check the validation before calling the API and use `.trim()` to remove spaces from the beginning and end of the submitted reason.


### **Task 4:**

- *Role/permission-aware + UX states:* The read-only user can see the request data, but Approve is disabled and Reject is hidden because both actions check the request status and the user’s policies. In `cr-list.component.html`, I updated the empty-message condition so that it only appears when there are no requests or no matching filtered rows, instead of also appearing during loading or errors. The existing templates show loading messages, error messages, and Retry buttons. I also replaced `ngOnInit()` with `ngOnChanges()` in the detail component so that clicking another request updates the right pane, and reset the rejection reason when switching requests.

## 2. Component & state model

- The app consists of two main panels: one with a list of change requests and a filter for status , and a details panel that shows the proposed changes, totals, approval timeline and action controls for the selected change request.

- The parent component holds the selected request ID and passes it to the detail component, and SessionService holds the current user. The detail component tracks action submission, action errors and rejection reason separately.

- Data is pulled from the provided mock API. The availability of actions should depend on the status of the request and the permissions of the user.

## 3. Invariants I keep

<!-- Which properties the UI guarantees, and where in the component/template each is enforced. -->

| Invariant | How / where |
| --------- | ----------- |

## 4. Testing strategy

<!-- What you tested (component/DOM vs pure) and why; what you deliberately skipped given the budget. -->

-

## 5. Assumptions

<!-- Where the requirements left room for interpretation, the calls you made and why. -->

-

## 6. Where I used AI

-

## 7. What I'd improve with more time

-
