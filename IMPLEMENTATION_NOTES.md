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
