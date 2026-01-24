const getMentionedUserNames = (content) => {
  if (!content || typeof content !== "string") return [];

  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const mentions = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1].toLowerCase());
  }

  // Remove duplicates using Set
  return [...new Set(mentions)];
};


export {getMentionedUserNames}