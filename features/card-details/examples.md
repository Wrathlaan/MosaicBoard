- User: "Assign me to this ticket."
  Action: `toggleMember({ "cardId": "...", "memberId": "member-1" })`

- User: "Add the 'Feature' label."
  Action: `toggleLabel({ "cardId": "...", "labelId": "label-1" })`

- User: "Remind me to do this next week."
  Action: `updateCardDetails({ "cardId": "...", "updates": { "dueDate": { "timestamp": 167... } } })`
