import type { SubjectSeeds } from "./index";

/**
 * English curriculum skeleton, Year 3 → A-Level.
 * KS2/KS3 cover reading, writing and spelling/grammar; GCSE/A-Level cover the
 * common assessment areas across AQA / Edexcel / OCR / Eduqas. The selected
 * board is passed to the AI generator for board-appropriate phrasing.
 */
export const ENGLISH_SEEDS: SubjectSeeds = {
  "year-3": [
    { strand: "Reading", name: "Reading Comprehension", subtopics: ["Retrieve facts from a text", "Make simple inferences", "Predict what might happen", "Discuss the meaning of words"] },
    { strand: "Writing", name: "Writing Composition", subtopics: ["Plan and structure a paragraph", "Write for a purpose", "Use adjectives and adverbs", "Sequence ideas"] },
    { strand: "Grammar and Punctuation", name: "Grammar", subtopics: ["Nouns, verbs and adjectives", "Conjunctions (when, if, because)", "Prepositions", "Present and past tense"] },
    { strand: "Grammar and Punctuation", name: "Punctuation", subtopics: ["Capital letters and full stops", "Question and exclamation marks", "Commas in a list", "Apostrophes for contraction"] },
    { strand: "Spelling and Vocabulary", name: "Spelling", subtopics: ["Common prefixes and suffixes", "Homophones", "Spelling patterns", "Using a dictionary"] },
  ],
  "year-4": [
    { strand: "Reading", name: "Reading Comprehension", subtopics: ["Retrieval and inference", "Summarise main ideas", "Identify how language creates effect", "Justify with evidence"] },
    { strand: "Writing", name: "Writing Composition", subtopics: ["Organise into paragraphs", "Fronted adverbials", "Description and dialogue", "Editing and improving"] },
    { strand: "Grammar and Punctuation", name: "Grammar", subtopics: ["Pronouns", "Fronted adverbials", "Expanded noun phrases", "Standard English verb forms"] },
    { strand: "Grammar and Punctuation", name: "Punctuation", subtopics: ["Commas after fronted adverbials", "Apostrophes for possession", "Inverted commas for speech"] },
    { strand: "Spelling and Vocabulary", name: "Spelling", subtopics: ["Prefixes and suffixes", "Homophones", "Word families", "Common exception words"] },
  ],
  "year-5": [
    { strand: "Reading", name: "Reading Comprehension", subtopics: ["Retrieval and inference", "Author's use of language", "Compare texts", "Summarise across paragraphs"] },
    { strand: "Writing", name: "Writing Composition", subtopics: ["Plan for audience and purpose", "Cohesion across paragraphs", "Descriptive and persuasive techniques", "Editing for impact"] },
    { strand: "Grammar and Punctuation", name: "Grammar", subtopics: ["Relative clauses", "Modal verbs", "Adverbs of possibility", "Expanded noun phrases"] },
    { strand: "Grammar and Punctuation", name: "Punctuation", subtopics: ["Brackets, dashes and commas for parenthesis", "Commas to avoid ambiguity"] },
    { strand: "Spelling and Vocabulary", name: "Spelling", subtopics: ["Words with silent letters", "Homophones", "Suffixes -cious/-tious", "Ambitious vocabulary"] },
  ],
  "year-6": [
    { strand: "Reading", name: "Reading Comprehension", subtopics: ["Retrieval, inference and deduction", "Analyse language and structure", "Compare and evaluate", "Explain writer's choices (SATs style)"] },
    { strand: "Writing", name: "Writing Composition", subtopics: ["Formal and informal writing", "Cohesive devices", "Show not tell", "Proofreading and editing"] },
    { strand: "Grammar and Punctuation", name: "Grammar (SPaG)", subtopics: ["Subjunctive and passive voice", "Subject and object", "Synonyms and antonyms", "Formal vocabulary"] },
    { strand: "Grammar and Punctuation", name: "Punctuation (SPaG)", subtopics: ["Semi-colons and colons", "Hyphens", "Bullet points", "Punctuating speech"] },
    { strand: "Spelling and Vocabulary", name: "Spelling", subtopics: ["Word endings -able/-ible", "Homophones", "Common exception words", "Spelling strategies"] },
  ],
  "year-7": [
    { strand: "Reading", name: "Reading and Analysis", subtopics: ["Retrieval and inference", "Language analysis (word and phrase level)", "Structure of fiction and non-fiction", "Introduction to poetry"] },
    { strand: "Writing", name: "Creative and Transactional Writing", subtopics: ["Narrative writing", "Descriptive writing", "Writing to persuade", "Vocabulary for effect"] },
    { strand: "Grammar and Vocabulary", name: "Grammar and Vocabulary", subtopics: ["Word classes", "Sentence types", "Punctuation for clarity", "Ambitious vocabulary"] },
    { strand: "Spoken Language", name: "Speaking and Listening", subtopics: ["Structured discussion", "Presenting ideas", "Listening and responding"] },
  ],
  "year-8": [
    { strand: "Reading", name: "Reading and Analysis", subtopics: ["Analysing writer's methods", "Comparing texts", "Non-fiction and media texts", "Shakespeare (introduction)"] },
    { strand: "Writing", name: "Writing Skills", subtopics: ["Crafting openings and endings", "Writing to argue and advise", "Rhetorical devices", "Editing for accuracy"] },
    { strand: "Grammar and Vocabulary", name: "Grammar and Vocabulary", subtopics: ["Complex sentences", "Cohesion and paragraphing", "Punctuation for effect", "Standard English"] },
    { strand: "Poetry", name: "Poetry", subtopics: ["Poetic devices", "Form and structure", "Comparing poems", "Writing poetry"] },
  ],
  "year-9": [
    { strand: "Reading", name: "Reading and Analysis", subtopics: ["Analysing language and structure", "19th-century texts", "Comparing viewpoints", "Preparing for GCSE-style questions"] },
    { strand: "Writing", name: "Writing Skills", subtopics: ["Descriptive and narrative writing", "Persuasive essays", "Structuring an argument", "Accuracy and control"] },
    { strand: "Literature", name: "Literature Study", subtopics: ["Studying a whole text", "Character and theme analysis", "Context and meaning", "Essay writing"] },
    { strand: "Grammar and Vocabulary", name: "Grammar and Vocabulary", subtopics: ["Sophisticated sentence structures", "Vocabulary for precision", "Punctuation range"] },
  ],
  gcse: [
    { strand: "Language", name: "Reading — Fiction", subtopics: ["Information retrieval", "Language analysis", "Structure analysis", "Evaluation of texts"] },
    { strand: "Language", name: "Reading — Non-Fiction", subtopics: ["Comparing texts and viewpoints", "Analysing persuasive methods", "Summary and synthesis", "19th/20th/21st-century sources"] },
    { strand: "Language", name: "Creative Writing", subtopics: ["Narrative writing", "Descriptive writing", "Structuring for effect", "Vocabulary and sentence variety"] },
    { strand: "Language", name: "Transactional / Persuasive Writing", subtopics: ["Writing to argue", "Writing to persuade", "Letters, articles and speeches", "Rhetorical devices"] },
    { strand: "Language", name: "Technical Accuracy (SPaG)", subtopics: ["Sentence structures", "Punctuation range", "Spelling", "Standard English"] },
    { strand: "Literature", name: "Shakespeare", subtopics: ["Plot and character", "Themes and context", "Extract-based analysis", "Essay technique"] },
    { strand: "Literature", name: "19th-Century Novel", subtopics: ["Character and theme", "Social and historical context", "Writer's methods", "Essay planning"] },
    { strand: "Literature", name: "Modern Text", subtopics: ["Character and theme", "Context", "Dramatic/narrative methods", "Essay writing"] },
    { strand: "Literature", name: "Poetry Anthology", subtopics: ["Analysing poems", "Comparing poems", "Form, structure and language", "Unseen poetry"] },
    { strand: "Spoken Language", name: "Spoken Language Endorsement", subtopics: ["Presentation skills", "Responding to questions", "Standard English"] },
  ],
  "a-level": [
    { strand: "Literature", name: "Prose", subtopics: ["Close reading and analysis", "Comparing prose texts", "Context and critical interpretations", "Essay construction"] },
    { strand: "Literature", name: "Poetry", subtopics: ["Analysing poetic methods", "Comparing poetry", "Unseen poetry", "Critical readings"] },
    { strand: "Literature", name: "Drama", subtopics: ["Tragedy and comedy", "Dramatic methods", "Context and interpretations", "Shakespeare study"] },
    { strand: "Language", name: "Language Analysis", subtopics: ["Language levels (lexis, grammar, phonology)", "Discourse and pragmatics", "Analysing texts", "Language and mode"] },
    { strand: "Language", name: "Language Topics", subtopics: ["Language and gender", "Language and power", "Language change over time", "Child language acquisition"] },
    { strand: "Language", name: "Original and Non-Fiction Writing", subtopics: ["Crafting original writing", "Writing commentaries", "Non-fiction genres"] },
    { strand: "Skills", name: "Coursework and NEA", subtopics: ["Independent research", "Comparative essay writing", "Referencing and analysis"] },
  ],
};
