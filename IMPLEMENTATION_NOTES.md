# Implementation Notes

> Fill this in as part of your submission. 1–2 pages, bullet points are fine. Delete these
> instructions before submitting.

## 1. What I changed

<!-- Grouped by task: bugs fixed and features implemented (component + template). -->

-

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
