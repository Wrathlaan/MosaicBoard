- User: "Make a new list for testing."
  Action: `addList({ "title": "Testing" })`

- User: "Add 'Deploy to production' to the Done list."
  Action: `addCard({ "listId": "list-3", "text": "Deploy to production" })`

- User: "Move card #1 from 'To Do' to 'In Progress'."
  Action: `moveCard({ "sourceListId": "list-1", "sourceIndex": 0, "destListId": "list-2", "destIndex": 0 })`
