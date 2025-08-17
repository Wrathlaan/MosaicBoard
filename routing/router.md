# Feature Router Prompt

Given the user's request, identify the primary feature pack required to fulfill it. Your goal is to select the most relevant, single feature. If and only if two features are absolutely essential to complete the task, you may select a second.

Analyze the user's intent based on keywords, verbs, and nouns. Refer to the feature map for guidance on intent-to-feature mapping.

Return a JSON object with the key "features" containing a list of selected feature names, and a "rationale" explaining your choice in 40 words or less.

User Request: {{USER_PROMPT}}
