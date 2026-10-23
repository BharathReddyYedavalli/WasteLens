/* Available Gemini studio voices. Google documents gender and delivery style.
   AI voice synthesis sends spoken text to Google only after a user opts in. */
export const AI_VOICES = [
  {id:"Kore",gender:"female",style:"Firm"},
  {id:"Aoede",gender:"female",style:"Breezy"},
  {id:"Sulafat",gender:"female",style:"Warm"},
  {id:"Zephyr",gender:"female",style:"Bright"},
  {id:"Puck",gender:"male",style:"Upbeat"},
  {id:"Charon",gender:"male",style:"Informative"},
  {id:"Achird",gender:"male",style:"Friendly"},
  {id:"Algieba",gender:"male",style:"Smooth"}
] as const;
export type AiVoiceName = typeof AI_VOICES[number]["id"];
