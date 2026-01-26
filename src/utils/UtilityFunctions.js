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

const extractHashtags = (text = "") => {
  const matches = text.match(/#[\w]+/g) || [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
};

const getPublicIdOfFile = (imageUrl) => {
  const splitImage = imageUrl.split("/");
  const publicId = splitImage[splitImage.length - 1].split(".")[0];
  return publicId;
};

export { getMentionedUserNames, extractHashtags, getPublicIdOfFile };
