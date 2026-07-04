import type { SubjectSeeds } from "./index";

/**
 * Science curriculum skeleton, Year 3 → A-Level.
 * KS2/KS3 follow the National Curriculum programmes of study. GCSE/A-Level are
 * organised by the Biology / Chemistry / Physics strands common to AQA /
 * Edexcel / OCR. The selected board is passed to the AI generator.
 */
export const SCIENCE_SEEDS: SubjectSeeds = {
  "year-3": [
    { strand: "Biology", name: "Plants", subtopics: ["Parts of a plant", "What plants need to grow", "The life cycle of a flowering plant", "Water transport in plants"] },
    { strand: "Biology", name: "Animals including Humans", subtopics: ["Nutrition and food groups", "Skeletons and muscles", "Movement"] },
    { strand: "Chemistry", name: "Rocks", subtopics: ["Types of rocks", "How fossils are formed", "Soils"] },
    { strand: "Physics", name: "Light", subtopics: ["Light and dark", "Reflection", "Shadows", "Protecting eyes from the sun"] },
    { strand: "Physics", name: "Forces and Magnets", subtopics: ["Contact and non-contact forces", "Magnetic materials", "Poles attract and repel"] },
  ],
  "year-4": [
    { strand: "Biology", name: "Living Things and Habitats", subtopics: ["Classification and grouping", "Classification keys", "Environments and change"] },
    { strand: "Biology", name: "Animals including Humans", subtopics: ["The digestive system", "Types of teeth", "Food chains"] },
    { strand: "Chemistry", name: "States of Matter", subtopics: ["Solids, liquids and gases", "Changes of state", "The water cycle", "Evaporation and condensation"] },
    { strand: "Physics", name: "Sound", subtopics: ["How sound is made", "Vibrations and travel", "Pitch and volume"] },
    { strand: "Physics", name: "Electricity", subtopics: ["Common appliances", "Simple circuits", "Conductors and insulators"] },
  ],
  "year-5": [
    { strand: "Biology", name: "Living Things and Life Cycles", subtopics: ["Life cycles of mammals, amphibians, insects and birds", "Reproduction in plants and animals"] },
    { strand: "Biology", name: "Animals including Humans", subtopics: ["Changes as humans develop to old age", "Gestation periods"] },
    { strand: "Chemistry", name: "Properties and Changes of Materials", subtopics: ["Comparing materials", "Dissolving and solutions", "Separating mixtures", "Reversible and irreversible changes"] },
    { strand: "Physics", name: "Earth and Space", subtopics: ["The Sun, Earth and Moon", "Day and night", "The movement of planets"] },
    { strand: "Physics", name: "Forces", subtopics: ["Gravity", "Air and water resistance", "Levers, pulleys and gears"] },
  ],
  "year-6": [
    { strand: "Biology", name: "Living Things and Classification", subtopics: ["Classifying micro-organisms, plants and animals", "Characteristics of groups"] },
    { strand: "Biology", name: "Animals including Humans", subtopics: ["The circulatory system", "Diet, exercise and drugs", "How nutrients are transported"] },
    { strand: "Biology", name: "Evolution and Inheritance", subtopics: ["Adaptation", "Inheritance", "Fossils as evidence", "Natural selection (introduction)"] },
    { strand: "Chemistry", name: "Materials", subtopics: ["Reversible and irreversible changes", "Separating mixtures"] },
    { strand: "Physics", name: "Light", subtopics: ["How light travels", "How we see", "Shadows and reflection"] },
    { strand: "Physics", name: "Electricity", subtopics: ["Circuit symbols", "Voltage and brightness", "Variations in circuits"] },
  ],
  "year-7": [
    { strand: "Biology", name: "Cells and Organisms", subtopics: ["Cells, tissues and organs", "The human skeleton and muscles", "Reproduction in humans and plants"] },
    { strand: "Chemistry", name: "Particles and Reactions", subtopics: ["The particle model", "Elements, compounds and mixtures", "Acids and alkalis", "Separating techniques"] },
    { strand: "Physics", name: "Energy and Forces", subtopics: ["Energy stores and transfers", "Speed and motion", "Gravity and weight", "Introduction to electricity"] },
  ],
  "year-8": [
    { strand: "Biology", name: "Body Systems and Ecosystems", subtopics: ["Digestion and nutrition", "Breathing and respiration", "Food webs and ecosystems", "Health and drugs"] },
    { strand: "Chemistry", name: "The Periodic Table and Reactions", subtopics: ["The periodic table", "Chemical reactions and equations", "Combustion", "The Earth's structure"] },
    { strand: "Physics", name: "Waves, Electricity and Magnetism", subtopics: ["Light and sound waves", "Current, voltage and resistance", "Magnetism and electromagnets", "Heating and cooling"] },
  ],
  "year-9": [
    { strand: "Biology", name: "Cells and Genetics", subtopics: ["Cell structure and specialisation", "Photosynthesis and respiration", "Variation and inheritance", "Evolution and natural selection"] },
    { strand: "Chemistry", name: "Atoms and Reactions", subtopics: ["Atomic structure", "The periodic table", "Types of chemical reaction", "Rates of reaction (introduction)"] },
    { strand: "Physics", name: "Forces and Energy", subtopics: ["Forces and motion", "Energy resources", "Electricity and circuits", "Pressure"] },
  ],
  gcse: [
    { strand: "Biology", name: "Cell Biology", subtopics: ["Cell structure", "Cell division (mitosis)", "Transport in cells (diffusion, osmosis, active transport)", "Microscopy"] },
    { strand: "Biology", name: "Organisation", subtopics: ["The digestive system and enzymes", "The heart and blood vessels", "Health and disease", "Plant tissues and transport"] },
    { strand: "Biology", name: "Infection and Response", subtopics: ["Pathogens and disease", "The immune system", "Vaccination", "Drug development"] },
    { strand: "Biology", name: "Bioenergetics", subtopics: ["Photosynthesis", "Respiration", "Factors affecting rates"] },
    { strand: "Biology", name: "Homeostasis and Response", subtopics: ["The nervous system", "Hormones and the endocrine system", "Controlling blood glucose"] },
    { strand: "Biology", name: "Inheritance and Evolution", subtopics: ["DNA and genetics", "Genetic inheritance", "Variation and evolution", "Classification"] },
    { strand: "Biology", name: "Ecology", subtopics: ["Communities and ecosystems", "Cycling of materials", "Biodiversity and human impact"] },
    { strand: "Chemistry", name: "Atomic Structure and the Periodic Table", subtopics: ["Atoms, elements and compounds", "The periodic table", "Electronic structure", "Development of the model of the atom"] },
    { strand: "Chemistry", name: "Bonding and Structure", subtopics: ["Ionic, covalent and metallic bonding", "States of matter", "Properties of structures", "Nanoparticles"] },
    { strand: "Chemistry", name: "Quantitative Chemistry", subtopics: ["Conservation of mass", "Moles and calculations", "Concentration of solutions", "Percentage yield"] },
    { strand: "Chemistry", name: "Chemical Changes", subtopics: ["Reactivity series", "Acids, bases and neutralisation", "Electrolysis"] },
    { strand: "Chemistry", name: "Energy and Rates", subtopics: ["Exothermic and endothermic reactions", "Rates of reaction", "Reversible reactions and equilibrium"] },
    { strand: "Chemistry", name: "Organic and Analysis", subtopics: ["Crude oil and hydrocarbons", "Polymers", "Chemical analysis and tests"] },
    { strand: "Physics", name: "Energy", subtopics: ["Energy stores and transfers", "Efficiency", "Energy resources", "Power"] },
    { strand: "Physics", name: "Electricity", subtopics: ["Circuits and Ohm's law", "Series and parallel circuits", "Mains electricity", "Static electricity"] },
    { strand: "Physics", name: "Particle Model of Matter", subtopics: ["Density", "Internal energy and changes of state", "Specific heat capacity", "Gas pressure"] },
    { strand: "Physics", name: "Atomic Structure", subtopics: ["The atom and isotopes", "Radioactive decay", "Nuclear equations", "Half-life"] },
    { strand: "Physics", name: "Forces", subtopics: ["Contact and non-contact forces", "Newton's laws", "Momentum", "Stopping distances"] },
    { strand: "Physics", name: "Waves", subtopics: ["Transverse and longitudinal waves", "The electromagnetic spectrum", "Reflection and refraction", "Sound"] },
    { strand: "Physics", name: "Magnetism and Electromagnetism", subtopics: ["Magnetic fields", "Electromagnets", "The motor effect", "Induction"] },
  ],
  "a-level": [
    { strand: "Biology", name: "Biological Molecules", subtopics: ["Carbohydrates, lipids and proteins", "Enzymes", "Nucleic acids (DNA and RNA)", "ATP and water"] },
    { strand: "Biology", name: "Cells", subtopics: ["Cell structure and organelles", "Cell membranes and transport", "Cell division and the cell cycle", "The immune system"] },
    { strand: "Biology", name: "Exchange and Transport", subtopics: ["Gas exchange", "Mass transport in animals and plants", "The heart and circulation"] },
    { strand: "Biology", name: "Genetics and Evolution", subtopics: ["DNA, genes and protein synthesis", "Inheritance and variation", "Natural selection and speciation", "Populations and ecosystems"] },
    { strand: "Biology", name: "Energy and Response", subtopics: ["Photosynthesis", "Respiration", "Nervous coordination", "Homeostasis"] },
    { strand: "Chemistry", name: "Physical Chemistry", subtopics: ["Atomic structure", "Amount of substance (moles)", "Bonding", "Energetics", "Kinetics", "Equilibria", "Redox and electrochemistry", "Thermodynamics"] },
    { strand: "Chemistry", name: "Inorganic Chemistry", subtopics: ["Periodicity", "Group 2 and Group 7", "Transition metals", "Reactions of ions"] },
    { strand: "Chemistry", name: "Organic Chemistry", subtopics: ["Alkanes and alkenes", "Alcohols and halogenoalkanes", "Optical isomerism", "Aromatic chemistry", "Carbonyls and carboxylic acids", "Spectroscopy and NMR"] },
    { strand: "Physics", name: "Mechanics and Materials", subtopics: ["Kinematics and projectiles", "Newton's laws and momentum", "Work, energy and power", "Materials and Young's modulus"] },
    { strand: "Physics", name: "Waves and Optics", subtopics: ["Progressive and stationary waves", "Interference and diffraction", "Refraction and total internal reflection"] },
    { strand: "Physics", name: "Electricity", subtopics: ["Current, potential difference and resistance", "Circuits and EMF", "The potential divider"] },
    { strand: "Physics", name: "Fields", subtopics: ["Gravitational fields", "Electric fields", "Capacitance", "Magnetic fields and induction"] },
    { strand: "Physics", name: "Nuclear and Particle Physics", subtopics: ["Particle physics and the standard model", "Radioactivity", "Nuclear energy", "Quantum phenomena"] },
  ],
};
