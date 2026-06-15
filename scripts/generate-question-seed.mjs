import { writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const prizes = [
  100, 500, 1000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000,
  1000000,
];

const categories = [
  "Geography",
  "Science",
  "Nature",
  "Space",
  "Technology",
  "Landmarks",
  "Languages",
  "Food & Drink",
  "Weather & Climate",
  "Transport",
  "Oceans & Rivers",
  "Buildings & Architecture",
  "General Knowledge",
];

const levelFacts = [
  [
    ["Which ocean is the largest on Earth?", "Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Geography"],
    ["Which gas do plants take in during photosynthesis?", "Carbon dioxide", "Oxygen", "Helium", "Nitrogen", "Science"],
    ["Which animal is known for changing color to blend with surroundings?", "Chameleon", "Penguin", "Koala", "Zebra", "Nature"],
    ["Which planet is famous for its rings?", "Saturn", "Mars", "Venus", "Mercury", "Space"],
    ["What does a keyboard mainly help a computer user do?", "Enter text", "Cool the screen", "Store sunlight", "Measure rain", "Technology"],
    ["Which landmark is a tall iron tower in Paris?", "Eiffel Tower", "Leaning Tower of Pisa", "Tower Bridge", "Burj Khalifa", "Landmarks"],
    ["Which language is mainly spoken in Brazil?", "Portuguese", "Spanish", "French", "Italian", "Languages"],
    ["Which drink is made by steeping leaves in hot water?", "Tea", "Lemonade", "Milk", "Cola", "Food & Drink"],
    ["What weather event includes flashes of lightning?", "Thunderstorm", "Fog", "Drought", "Frost", "Weather & Climate"],
    ["Which vehicle runs on rails?", "Train", "Sailboat", "Helicopter", "Scooter", "Transport"],
    ["Which river is commonly described as the longest in Africa?", "Nile", "Amazon", "Danube", "Mekong", "Oceans & Rivers"],
    ["What do architects design?", "Buildings", "Recipes", "Satellites", "Musical notes", "Buildings & Architecture"],
    ["Which item is used to tell direction?", "Compass", "Thermometer", "Calendar", "Microscope", "General Knowledge"],
    ["Which continent is Australia part of by common school geography?", "Oceania", "Europe", "Africa", "South America", "Geography"],
    ["What force pulls objects toward Earth?", "Gravity", "Friction", "Magnetism", "Evaporation", "Science"],
    ["Which natural object grows from an acorn?", "Oak tree", "Cactus", "Fern", "Mushroom", "Nature"],
    ["What is the closest star to Earth?", "The Sun", "Sirius", "Polaris", "Betelgeuse", "Space"],
    ["Which device is used to take digital photos?", "Camera", "Router", "Printer", "Speaker", "Technology"],
    ["Which food is made from cacao beans?", "Chocolate", "Bread", "Cheese", "Rice", "Food & Drink"],
    ["Which transport usually travels through the sky?", "Airplane", "Subway", "Ferry", "Bicycle", "Transport"],
  ],
  [
    ["Which country contains the city of Kyoto?", "Japan", "Thailand", "India", "Greece", "Geography"],
    ["What state of matter has a fixed shape and volume?", "Solid", "Liquid", "Gas", "Plasma", "Science"],
    ["Which bird is known for its black-and-white coloring and living in cold southern regions?", "Penguin", "Toucan", "Flamingo", "Parrot", "Nature"],
    ["Which planet is known as the Red Planet?", "Mars", "Jupiter", "Neptune", "Venus", "Space"],
    ["What does Wi-Fi mainly provide?", "Wireless network access", "Battery charging", "Screen brightness", "Water cooling", "Technology"],
    ["The Colosseum is located in which city?", "Rome", "Athens", "Madrid", "Prague", "Landmarks"],
    ["Which language uses the words bonjour and merci?", "French", "German", "Dutch", "Swedish", "Languages"],
    ["Which grain is commonly used to make sushi?", "Rice", "Barley", "Oats", "Corn", "Food & Drink"],
    ["What instrument measures temperature?", "Thermometer", "Barometer", "Compass", "Anemometer", "Weather & Climate"],
    ["Which vehicle is designed to travel underwater?", "Submarine", "Tram", "Glider", "Monorail", "Transport"],
    ["Which river flows through London?", "Thames", "Seine", "Rhine", "Tiber", "Oceans & Rivers"],
    ["Which material is commonly used to make clear windows?", "Glass", "Rubber", "Clay", "Wool", "Buildings & Architecture"],
    ["Which shape has three sides?", "Triangle", "Square", "Hexagon", "Circle", "General Knowledge"],
    ["Which country is shaped like a boot on many maps?", "Italy", "Norway", "Chile", "Egypt", "Geography"],
    ["Which part of a plant absorbs most water from the soil?", "Roots", "Petals", "Fruit", "Seeds", "Science"],
    ["Which animal builds dams in rivers and streams?", "Beaver", "Otter", "Seal", "Badger", "Nature"],
    ["Which object orbits Earth and causes tides along with the Sun?", "The Moon", "Mars", "A comet", "A nebula", "Space"],
    ["What is a browser used for?", "Viewing websites", "Mixing paint", "Printing coins", "Filtering water", "Technology"],
    ["Which dairy food is usually fermented and often eaten with fruit?", "Yogurt", "Butter", "Cream", "Custard powder", "Food & Drink"],
    ["Which weather condition greatly reduces visibility near the ground?", "Fog", "Hail", "Rainbow", "Breeze", "Weather & Climate"],
  ],
  [
    ["Which desert is the largest hot desert in the world?", "Sahara", "Gobi", "Kalahari", "Atacama", "Geography"],
    ["What is the chemical symbol for oxygen?", "O", "Ox", "Og", "Om", "Science"],
    ["Which mammal is known for using echolocation to navigate?", "Bat", "Horse", "Panda", "Kangaroo", "Nature"],
    ["Which galaxy contains our Solar System?", "Milky Way", "Andromeda", "Triangulum", "Sombrero", "Space"],
    ["What does GPS help users find?", "Location", "File size", "Screen color", "Battery age", "Technology"],
    ["Machu Picchu is found in which country?", "Peru", "Mexico", "Portugal", "Morocco", "Landmarks"],
    ["Which language is written with the Cyrillic alphabet in many countries?", "Russian", "Arabic", "Hindi", "Greek", "Languages"],
    ["Which spice gives many curries a bright yellow color?", "Turmeric", "Cinnamon", "Nutmeg", "Clove", "Food & Drink"],
    ["What does a barometer measure?", "Air pressure", "Wind direction", "Rainfall amount", "Cloud height", "Weather & Climate"],
    ["Which transport system commonly uses overhead electric wires in cities?", "Tram", "Canoe", "Jet ski", "Hot-air balloon", "Transport"],
    ["Which ocean lies between Africa and Australia?", "Indian Ocean", "Atlantic Ocean", "Arctic Ocean", "Southern Ocean", "Oceans & Rivers"],
    ["Which architectural feature is a curved structure often used to span openings?", "Arch", "Column", "Tile", "Gutter", "Buildings & Architecture"],
    ["Which instrument makes very small things look larger?", "Microscope", "Telescope", "Periscope", "Kaleidoscope", "General Knowledge"],
    ["Which mountain range runs through Nepal?", "Himalayas", "Andes", "Rockies", "Alps", "Geography"],
    ["Which organ pumps blood around the body?", "Heart", "Liver", "Lung", "Stomach", "Science"],
    ["Which insect is important for pollinating many flowering plants?", "Bee", "Mosquito", "Termite", "Flea", "Nature"],
    ["What is a light-year a measure of?", "Distance", "Brightness", "Temperature", "Weight", "Space"],
    ["Which file type is commonly used for web page structure?", "HTML", "MP3", "JPEG", "ZIP", "Technology"],
    ["Which food is traditionally made by fermenting cabbage?", "Sauerkraut", "Risotto", "Hummus", "Polenta", "Food & Drink"],
    ["Which cloud type is often tall and linked with thunderstorms?", "Cumulonimbus", "Cirrus", "Stratus", "Altostratus", "Weather & Climate"],
  ],
  [
    ["Which capital city is located on the River Seine?", "Paris", "Vienna", "Budapest", "Lisbon", "Geography"],
    ["Which process changes liquid water into water vapor?", "Evaporation", "Condensation", "Freezing", "Deposition", "Science"],
    ["Which biome is dominated by grasses rather than large forests?", "Savanna", "Tundra", "Rainforest", "Taiga", "Nature"],
    ["Which planet has the Great Red Spot?", "Jupiter", "Saturn", "Uranus", "Mercury", "Space"],
    ["What does RAM help a computer do?", "Hold working data temporarily", "Print pages", "Record sound", "Display time zones", "Technology"],
    ["Angkor Wat is in which country?", "Cambodia", "Vietnam", "Laos", "Malaysia", "Landmarks"],
    ["Which language family includes Spanish, Italian, and French?", "Romance", "Germanic", "Slavic", "Celtic", "Languages"],
    ["Which ingredient makes bread rise when it produces gas?", "Yeast", "Salt", "Olive oil", "Cocoa", "Food & Drink"],
    ["What scale is commonly used to rate hurricane strength?", "Saffir-Simpson scale", "Richter scale", "Beaufort mineral scale", "Fujita rain scale", "Weather & Climate"],
    ["Which transport hub is primarily used by aircraft?", "Airport", "Harbor", "Depot", "Marina", "Transport"],
    ["Which sea lies between Italy and the Balkans?", "Adriatic Sea", "Baltic Sea", "Red Sea", "Caspian Sea", "Oceans & Rivers"],
    ["Which building shape is especially strong because it spreads weight to three sides?", "Triangle", "Oval", "Spiral", "Crescent", "Buildings & Architecture"],
    ["Which map line divides Earth into Northern and Southern Hemispheres?", "Equator", "Prime Meridian", "Tropic of Cancer", "Arctic Circle", "General Knowledge"],
    ["Which country includes the region called Patagonia with Argentina?", "Chile", "Bolivia", "Colombia", "Paraguay", "Geography"],
    ["Which particle has a negative electric charge?", "Electron", "Proton", "Neutron", "Photon", "Science"],
    ["Which tree type keeps needle-like leaves through most winters?", "Conifer", "Mangrove", "Palm", "Baobab", "Nature"],
    ["Which phase of the Moon is fully lit from Earth?", "Full Moon", "New Moon", "First quarter", "Crescent", "Space"],
    ["Which technology stores data in remote internet-connected servers?", "Cloud storage", "Dot-matrix printing", "Analog tuning", "Optical zoom", "Technology"],
    ["Which food is made from chickpeas and tahini?", "Hummus", "Kimchi", "Pesto", "Miso soup", "Food & Drink"],
    ["Which wind scale ranges from calm air to hurricane-force winds?", "Beaufort scale", "Mohs scale", "pH scale", "Kelvin scale", "Weather & Climate"],
  ],
  [
    ["Which country has the most natural lakes by many geographic counts?", "Canada", "Brazil", "Spain", "Egypt", "Geography"],
    ["Which part of an atom contains protons and neutrons?", "Nucleus", "Shell", "Orbit", "Bond", "Science"],
    ["Which ocean zone receives little to no sunlight?", "Aphotic zone", "Intertidal zone", "Neritic zone", "Epipelagic zone", "Nature"],
    ["Which dwarf planet is located in the asteroid belt?", "Ceres", "Pluto", "Eris", "Haumea", "Space"],
    ["What does encryption mainly protect?", "Readable data from unauthorized access", "Screen brightness", "Speaker volume", "Keyboard layout", "Technology"],
    ["Petra is famous for buildings carved into rock in which country?", "Jordan", "Tunisia", "Oman", "Lebanon", "Landmarks"],
    ["Which language is mainly written using Hangul?", "Korean", "Thai", "Turkish", "Finnish", "Languages"],
    ["Which cooking method uses steam from simmering liquid?", "Steaming", "Grilling", "Frying", "Smoking", "Food & Drink"],
    ["Which climate zone is usually hot and wet all year?", "Tropical rainforest", "Mediterranean", "Tundra", "Steppe", "Weather & Climate"],
    ["Which train type floats above the track using magnetic forces?", "Maglev", "Diesel freight", "Cable car", "Funicular", "Transport"],
    ["Which river forms part of the border between the United States and Mexico?", "Rio Grande", "Mississippi", "Columbia", "Colorado", "Oceans & Rivers"],
    ["What is the name for a vertical support in a building?", "Column", "Lintel", "Cornice", "Skylight", "Buildings & Architecture"],
    ["Which scale measures acidity or alkalinity?", "pH scale", "Richter scale", "Decibel scale", "Beaufort scale", "General Knowledge"],
    ["Which strait separates Spain from Morocco?", "Strait of Gibraltar", "Bering Strait", "Malacca Strait", "Cook Strait", "Geography"],
    ["Which type of energy is stored in food?", "Chemical energy", "Sound energy", "Nuclear energy", "Elastic wave energy", "Science"],
    ["Which animal group includes frogs and salamanders?", "Amphibians", "Reptiles", "Mollusks", "Crustaceans", "Nature"],
    ["Which planet rotates on its side compared with most planets?", "Uranus", "Neptune", "Earth", "Mars", "Space"],
    ["What is a database mainly used to organize?", "Data records", "Weather fronts", "Sound waves", "Paint colors", "Technology"],
    ["Which cheese is traditionally used on a classic Margherita pizza?", "Mozzarella", "Cheddar", "Feta", "Gouda", "Food & Drink"],
    ["Which weather front forms when cold air pushes under warm air?", "Cold front", "Warm front", "Stationary front", "Occluded high", "Weather & Climate"],
  ],
  [
    ["Which African country contains the Okavango Delta?", "Botswana", "Ghana", "Ethiopia", "Senegal", "Geography"],
    ["What is the main gas in Earth's atmosphere?", "Nitrogen", "Oxygen", "Carbon dioxide", "Argon", "Science"],
    ["Which ecosystem is formed where freshwater and saltwater mix?", "Estuary", "Desert", "Prairie", "Glacier", "Nature"],
    ["Which moon is the largest moon of Saturn?", "Titan", "Europa", "Ganymede", "Phobos", "Space"],
    ["Which term describes a network device that forwards data packets?", "Router", "Scanner", "Monitor", "Stylus", "Technology"],
    ["The Alhambra palace complex is in which country?", "Spain", "Turkey", "India", "Croatia", "Landmarks"],
    ["Which language is closely related to Dutch and spoken in South Africa?", "Afrikaans", "Swahili", "Malay", "Welsh", "Languages"],
    ["Which drink is traditionally made by fermenting tea with a culture?", "Kombucha", "Espresso", "Smoothie", "Cordial", "Food & Drink"],
    ["Which ocean current helps warm western Europe?", "Gulf Stream", "Humboldt Current", "Benguela Current", "Oyashio Current", "Weather & Climate"],
    ["Which transport term means carrying goods by ship, train, truck, or air?", "Freight", "Transit lounge", "Layover", "Boarding pass", "Transport"],
    ["Which river is strongly associated with the Grand Canyon?", "Colorado River", "Murray River", "Volga River", "Niger River", "Oceans & Rivers"],
    ["Which structure transfers roof weight outward in some large stone buildings?", "Flying buttress", "Balustrade", "Awning", "Atrium", "Buildings & Architecture"],
    ["Which layer of Earth lies directly below the crust?", "Mantle", "Core", "Lithosphere only", "Atmosphere", "General Knowledge"],
    ["Which country includes the islands of Java and Sumatra?", "Indonesia", "Philippines", "New Zealand", "Madagascar", "Geography"],
    ["Which biological process copies DNA before cell division?", "Replication", "Evaporation", "Sublimation", "Fermentation", "Science"],
    ["Which plant adaptation reduces water loss in many desert plants?", "Waxy coating", "Broad soft leaves", "Hollow bones", "Bright feathers", "Nature"],
    ["Which type of star is the Sun currently classified as?", "Main-sequence star", "White dwarf", "Neutron star", "Red supergiant", "Space"],
    ["What does an operating system mainly manage?", "Computer hardware and software resources", "Ocean tides", "Kitchen temperature", "Road signs", "Technology"],
    ["Which cooking term means to cook briefly in boiling water then cool quickly?", "Blanch", "Braise", "Caramelize", "Marinate", "Food & Drink"],
    ["Which phenomenon is a rotating column of air connected to a thunderstorm?", "Tornado", "Monsoon", "Mist", "Heat haze", "Weather & Climate"],
  ],
  [
    ["Which country contains the Salar de Uyuni salt flat?", "Bolivia", "Peru", "Ecuador", "Uruguay", "Geography"],
    ["Which element has the chemical symbol Fe?", "Iron", "Fluorine", "Francium", "Fermium", "Science"],
    ["Which term describes an animal active mainly at dawn and dusk?", "Crepuscular", "Nocturnal", "Diurnal", "Dormant", "Nature"],
    ["Which planet has the shortest day, rotating fastest on its axis?", "Jupiter", "Earth", "Venus", "Mars", "Space"],
    ["Which cybersecurity attack tricks users into revealing private information?", "Phishing", "Defragmenting", "Rendering", "Caching", "Technology"],
    ["Borobudur is a large ancient monument in which country?", "Indonesia", "Myanmar", "Nepal", "Sri Lanka", "Landmarks"],
    ["Which writing system is used for modern Greek?", "Greek alphabet", "Latin alphabet only", "Hangul", "Devanagari", "Languages"],
    ["Which sauce is traditionally made with basil, garlic, pine nuts, cheese, and olive oil?", "Pesto", "Salsa", "Tahini", "Gravy", "Food & Drink"],
    ["What is the name for a long-term average pattern of weather?", "Climate", "Forecast", "Gust", "Front", "Weather & Climate"],
    ["Which transport route connects two bodies of water through an artificial channel?", "Canal", "Runway", "Viaduct", "Cul-de-sac", "Transport"],
    ["Which sea is the saltiest large natural lake commonly called a sea?", "Dead Sea", "Black Sea", "North Sea", "Java Sea", "Oceans & Rivers"],
    ["Which architectural style is known for pointed arches and ribbed vaults?", "Gothic", "Brutalist", "Bauhaus", "Art Deco", "Buildings & Architecture"],
    ["Which mineral scale ranks hardness from talc to diamond?", "Mohs scale", "Kelvin scale", "Mercalli scale", "Fujita scale", "General Knowledge"],
    ["Which island country lies southeast of India and is known for tea-growing highlands?", "Sri Lanka", "Maldives", "Bahrain", "Cyprus", "Geography"],
    ["Which type of bond involves sharing electron pairs?", "Covalent bond", "Ionic wind", "Metallic orbit", "Hydraulic bond", "Science"],
    ["Which biome has permanently frozen subsoil called permafrost?", "Tundra", "Chaparral", "Mangrove forest", "Coral reef", "Nature"],
    ["Which astronomical event occurs when the Moon passes between Earth and the Sun?", "Solar eclipse", "Lunar eclipse", "Meteor shower", "Aurora", "Space"],
    ["Which data unit is larger than a megabyte?", "Gigabyte", "Kilobyte", "Bit", "Nibble", "Technology"],
    ["Which bean is used to make traditional miso?", "Soybean", "Lentil", "Kidney bean", "Black-eyed pea", "Food & Drink"],
    ["Which cloud appears wispy and high in the sky?", "Cirrus", "Cumulus", "Stratus", "Nimbostratus", "Weather & Climate"],
  ],
  [
    ["Which sea lies between Queensland and Papua New Guinea?", "Coral Sea", "Tasman Sea", "Arafura Sea", "Bering Sea", "Geography"],
    ["Which law says energy cannot be created or destroyed, only transformed?", "Conservation of energy", "Continental drift", "Natural selection", "Capillary action", "Science"],
    ["Which process do corals rely on through algae living in their tissues?", "Photosynthesis", "Hibernation", "Molting", "Echolocation", "Nature"],
    ["Which moon is the largest in the Solar System?", "Ganymede", "Titan", "Callisto", "Io", "Space"],
    ["Which term describes software code made available for anyone to inspect and modify?", "Open source", "Closed circuit", "Hard reset", "Dark mode", "Technology"],
    ["Which landmark complex includes the Treasury carved into sandstone?", "Petra", "Chichen Itza", "Stonehenge", "Mesa Verde", "Landmarks"],
    ["Which language uses Devanagari as one common writing script?", "Hindi", "Vietnamese", "Polish", "Icelandic", "Languages"],
    ["Which process browns sugar when heated and changes its flavor?", "Caramelization", "Pasteurization", "Pickling", "Proofing", "Food & Drink"],
    ["Which pattern brings seasonal winds and heavy rain to parts of South Asia?", "Monsoon", "Foehn wind", "Trade inversion", "Polar night", "Weather & Climate"],
    ["Which aircraft can take off and land vertically using rotating blades?", "Helicopter", "Glider", "Jetliner", "Seaplane", "Transport"],
    ["Which river drains the largest basin in South America?", "Amazon", "Orinoco", "Parana", "Magdalena", "Oceans & Rivers"],
    ["Which feature is a central open space inside a building?", "Atrium", "Pilaster", "Cornice", "Buttress", "Buildings & Architecture"],
    ["Which term means the variety of living species in an area?", "Biodiversity", "Topography", "Viscosity", "Refraction", "General Knowledge"],
    ["Which archipelago includes the islands of Luzon and Mindanao?", "Philippines", "Fiji", "Seychelles", "Azores", "Geography"],
    ["Which substance speeds a chemical reaction without being used up?", "Catalyst", "Solvent", "Reactant", "Mixture", "Science"],
    ["Which plant group reproduces with spores rather than seeds?", "Ferns", "Grasses", "Conifers", "Orchids", "Nature"],
    ["Which spacecraft type is designed to orbit a planet rather than land?", "Orbiter", "Rover", "Lander", "Probe balloon", "Space"],
    ["Which part of a URL commonly identifies the website name?", "Domain", "Pixel", "Folder icon", "Cache line", "Technology"],
    ["Which cooking method slowly cooks food in a small amount of liquid in a covered pot?", "Braising", "Whisking", "Sifting", "Toasting", "Food & Drink"],
    ["Which climate phenomenon involves unusual warming of surface waters in the central and eastern Pacific?", "El Nino", "Polar vortex", "Sea breeze", "Katabatic wind", "Weather & Climate"],
  ],
  [
    ["Which plateau is often called the roof of the world?", "Tibetan Plateau", "Deccan Plateau", "Colorado Plateau", "Ethiopian Highlands", "Geography"],
    ["Which electromagnetic radiation has a shorter wavelength than visible violet light?", "Ultraviolet", "Infrared", "Microwave", "Radio wave", "Science"],
    ["Which ecological role describes an organism that breaks down dead material?", "Decomposer", "Producer", "Apex predator", "Pollinator", "Nature"],
    ["Which object is left after some massive stars explode as supernovae?", "Neutron star", "Brown dwarf", "Comet tail", "Dust devil", "Space"],
    ["Which database language is commonly used to query relational databases?", "SQL", "CSS", "SVG", "WAV", "Technology"],
    ["Which ancient site is arranged in a circle of large standing stones?", "Stonehenge", "Tikal", "Pompeii", "Ephesus", "Landmarks"],
    ["Which language is part of the Germanic language family?", "Norwegian", "Romanian", "Catalan", "Basque", "Languages"],
    ["Which technique preserves food by removing moisture?", "Dehydration", "Emulsification", "Aeration", "Tempering", "Food & Drink"],
    ["Which boundary is where two air masses meet?", "Weather front", "Rain shadow", "Dew point", "Jet stream core", "Weather & Climate"],
    ["Which transport structure carries a road or railway over a valley or obstacle?", "Viaduct", "Hangar", "Terminal", "Towpath", "Transport"],
    ["Which ocean trench is the deepest known point in Earth's oceans?", "Mariana Trench", "Java Trench", "Puerto Rico Trench", "Tonga Trench", "Oceans & Rivers"],
    ["Which design movement is associated with simple forms and function-led design?", "Bauhaus", "Rococo", "Baroque", "Gothic Revival", "Buildings & Architecture"],
    ["Which term describes bending of light as it passes between materials?", "Refraction", "Conduction", "Erosion", "Sublimation", "General Knowledge"],
    ["Which country contains the fjord region around Milford Sound?", "New Zealand", "Norway", "Iceland", "Canada", "Geography"],
    ["Which scale is used to classify mineral hardness?", "Mohs scale", "Beaufort scale", "Scoville scale", "Richter scale", "Science"],
    ["Which relationship benefits both species involved?", "Mutualism", "Parasitism", "Competition", "Predation", "Nature"],
    ["Which point in a planet's orbit is closest to the Sun?", "Perihelion", "Aphelion", "Zenith", "Solstice", "Space"],
    ["Which term describes copying data to a separate location for protection?", "Backup", "Overclock", "Latency", "Firmware", "Technology"],
    ["Which pastry dough is folded with butter to create many flaky layers?", "Puff pastry", "Shortcrust", "Choux", "Filo only", "Food & Drink"],
    ["Which effect causes dry conditions on the leeward side of mountains?", "Rain shadow", "Sea fog", "Lake breeze", "Thermal inversion", "Weather & Climate"],
  ],
  [
    ["Which sea is bordered by countries including Bulgaria, Romania, and Turkey?", "Black Sea", "Baltic Sea", "Arabian Sea", "Timor Sea", "Geography"],
    ["Which number describes how many protons an atom has?", "Atomic number", "Mass density", "Valence total", "Isotope age", "Science"],
    ["Which term describes seasonal movement of animals between regions?", "Migration", "Germination", "Camouflage", "Photosynthesis", "Nature"],
    ["Which type of galaxy is the Milky Way?", "Barred spiral", "Elliptical", "Irregular", "Ring galaxy", "Space"],
    ["Which networking term describes delay before data begins arriving?", "Latency", "Bandwidth", "Resolution", "Compression", "Technology"],
    ["Which structure in India is a stepwell known for geometric stair patterns?", "Chand Baori", "Himeji Castle", "Pont du Gard", "Sigiriya", "Landmarks"],
    ["Which language is one of the official languages of Switzerland?", "Romansh", "Estonian", "Maltese", "Albanian", "Languages"],
    ["Which taste is commonly associated with glutamates?", "Umami", "Sourness", "Bitterness", "Astringency", "Food & Drink"],
    ["Which atmospheric layer contains most weather?", "Troposphere", "Stratosphere", "Mesosphere", "Thermosphere", "Weather & Climate"],
    ["Which term describes a scheduled stop between flights?", "Layover", "Switchback", "Mooring", "Slipstream", "Transport"],
    ["Which river flows through the city of Cairo?", "Nile", "Tigris", "Po", "Loire", "Oceans & Rivers"],
    ["Which architectural term refers to the top part of a classical column?", "Capital", "Nave", "Truss", "Facade", "Buildings & Architecture"],
    ["Which process wears away rock and soil by wind, water, or ice?", "Erosion", "Condensation", "Ionization", "Magnetization", "General Knowledge"],
    ["Which country contains the Atacama Desert?", "Chile", "Namibia", "Mongolia", "Iran", "Geography"],
    ["Which molecule carries genetic instructions in living things?", "DNA", "ATP only", "Glucose", "Chlorophyll", "Science"],
    ["Which forest type grows in salty coastal tidal zones?", "Mangrove", "Boreal", "Cloud forest", "Temperate deciduous", "Nature"],
    ["Which planet has the hottest average surface temperature?", "Venus", "Mercury", "Mars", "Jupiter", "Space"],
    ["Which term describes reducing file size by encoding data efficiently?", "Compression", "Compilation", "Calibration", "Rendering", "Technology"],
    ["Which fermented soybean product is often used in Japanese soup?", "Miso", "Paneer", "Couscous", "Molasses", "Food & Drink"],
    ["Which weather instrument measures wind speed?", "Anemometer", "Hygrometer", "Seismometer", "Altimeter", "Weather & Climate"],
  ],
  [
    ["Which lake is the world's deepest freshwater lake by maximum depth?", "Lake Baikal", "Lake Superior", "Lake Victoria", "Lake Tanganyika", "Geography"],
    ["Which principle explains why a boat can float when it displaces enough water?", "Buoyancy", "Osmosis", "Static charge", "Diffusion", "Science"],
    ["Which term describes a species found naturally in only one geographic area?", "Endemic", "Invasive", "Domesticated", "Migratory", "Nature"],
    ["Which boundary around a black hole marks the point beyond which light cannot escape?", "Event horizon", "Asteroid belt", "Solar wind", "Photosphere", "Space"],
    ["Which computing model runs isolated software packages with their dependencies?", "Containers", "Bookmarks", "Macros", "Widgets", "Technology"],
    ["Which ancient city ruins are located near modern Luxor on the Nile's east bank?", "Karnak", "Troy", "Carthage", "Knossos", "Landmarks"],
    ["Which language is a Uralic language?", "Finnish", "Portuguese", "Persian", "Malay", "Languages"],
    ["Which process gives yogurt its tangy flavor?", "Lactic fermentation", "Dry roasting", "Flash freezing", "Clarification", "Food & Drink"],
    ["Which term describes the temperature at which air becomes saturated and dew can form?", "Dew point", "Heat index", "Wind chill", "Pressure ridge", "Weather & Climate"],
    ["Which transport system uses cabins suspended from a moving cable?", "Aerial cable car", "Hovercraft", "Trolleybus", "Rickshaw", "Transport"],
    ["Which river is the major river of the Mesopotamian plain alongside the Tigris?", "Euphrates", "Indus", "Ganges", "Rhine", "Oceans & Rivers"],
    ["Which structural element spans an opening and supports weight above it?", "Lintel", "Mosaic", "Fresco", "Portico", "Buildings & Architecture"],
    ["Which term means a map's ratio between distance on the map and real distance?", "Scale", "Legend", "Contour", "Projection", "General Knowledge"],
    ["Which mountain range forms much of the border between France and Spain?", "Pyrenees", "Carpathians", "Caucasus", "Urals", "Geography"],
    ["Which type of rock forms from cooled magma or lava?", "Igneous", "Sedimentary only", "Metamorphic only", "Organic", "Science"],
    ["Which ecological term describes all living and nonliving parts interacting in an area?", "Ecosystem", "Genome", "Habitat only", "Food label", "Nature"],
    ["Which layer of the Sun is visible as its apparent surface?", "Photosphere", "Corona", "Chromosphere", "Core", "Space"],
    ["Which term describes a flaw that can be exploited in software security?", "Vulnerability", "Resolution", "Shortcut", "Format", "Technology"],
    ["Which ingredient is the base of traditional tahini?", "Sesame seeds", "Sunflower seeds", "Peanuts", "Pumpkin seeds", "Food & Drink"],
    ["Which large-scale wind belt generally blows from east to west in the tropics?", "Trade winds", "Westerlies", "Polar easterlies only", "Chinook winds", "Weather & Climate"],
  ],
  [
    ["Which island group sits on the Mid-Atlantic Ridge and is known for volcanic activity?", "Iceland", "Malta", "Bermuda", "Sardinia", "Geography"],
    ["Which concept describes particles passing from high concentration to low concentration?", "Diffusion", "Combustion", "Distillation", "Refraction", "Science"],
    ["Which term describes the role an organism plays in its ecosystem?", "Niche", "Biome", "Canopy", "Trophic map", "Nature"],
    ["Which limit describes the maximum mass of a stable white dwarf star?", "Chandrasekhar limit", "Roche boundary", "Kuiper point", "Kepler belt", "Space"],
    ["Which database property means a transaction fully completes or has no effect?", "Atomicity", "Pixel density", "Refresh rate", "Packet loss", "Technology"],
    ["Which ancient structure is a Roman aqueduct bridge in southern France?", "Pont du Gard", "Hadrian's Wall", "Hagia Sophia", "Teotihuacan", "Landmarks"],
    ["Which language isolate is spoken in parts of northern Spain and southwestern France?", "Basque", "Welsh", "Breton", "Galician", "Languages"],
    ["Which process uses salt or acid to preserve vegetables in brine?", "Pickling", "Tempering", "Whipping", "Reducing", "Food & Drink"],
    ["Which index combines temperature and humidity to describe perceived heat?", "Heat index", "Dew point spread", "Storm surge", "Pressure tendency", "Weather & Climate"],
    ["Which transport term describes a boat's left side when facing forward?", "Port", "Starboard", "Stern", "Bowline", "Transport"],
    ["Which current is a cold current along the west coast of South America?", "Humboldt Current", "Gulf Stream", "Kuroshio Current", "Agulhas Current", "Oceans & Rivers"],
    ["Which architectural term means the front face of a building?", "Facade", "Nave", "Apse", "Truss", "Buildings & Architecture"],
    ["Which term describes a material's resistance to flowing?", "Viscosity", "Luminosity", "Porosity only", "Conductivity only", "General Knowledge"],
    ["Which country contains the Danakil Depression?", "Ethiopia", "Kenya", "Morocco", "Tanzania", "Geography"],
    ["Which type of wave can travel through empty space?", "Electromagnetic wave", "Sound wave", "Water wave", "Seismic P-wave only", "Science"],
    ["Which animal behavior is a period of lowered activity during cold seasons?", "Hibernation", "Molting", "Estivation only", "Courtship", "Nature"],
    ["Which region beyond Neptune contains many icy bodies including Pluto?", "Kuiper Belt", "Oort Cloud only", "Asteroid Belt", "Magnetosphere", "Space"],
    ["Which term describes verifying identity with two different kinds of proof?", "Multi-factor authentication", "Packet switching", "Version control", "Lazy loading", "Technology"],
    ["Which cooking term means to thicken a sauce by simmering away liquid?", "Reduction", "Blooming", "Docking", "Scalding", "Food & Drink"],
    ["Which phenomenon bends large-scale winds because Earth rotates?", "Coriolis effect", "Greenhouse effect", "Albedo drift", "Orographic lift only", "Weather & Climate"],
  ],
];

function sql(value) {
  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

const rows = [];

for (const [levelIndex, facts] of levelFacts.entries()) {
  const level = levelIndex + 1;
  const prize = prizes[levelIndex];

  if (facts.length !== 20) {
    throw new Error(`Level ${level} has ${facts.length} questions, expected 20.`);
  }

  for (const [questionText, answerA, answerB, answerC, answerD, category] of facts) {
    if (!categories.includes(category)) {
      throw new Error(`Unexpected category ${category}`);
    }

    rows.push({
      active: true,
      answer_a: answerA,
      answer_b: answerB,
      answer_c: answerC,
      answer_d: answerD,
      category,
      correct_answer: "A",
      level,
      prize_amount: prize,
      question_text: questionText,
      report_count: 0,
    });
  }
}

if (rows.length !== 240) {
  throw new Error(`Expected 240 questions, got ${rows.length}.`);
}

export const starterQuestions = rows;

const values = rows
  .map((row) =>
    [
      row.question_text,
      row.answer_a,
      row.answer_b,
      row.answer_c,
      row.answer_d,
      row.correct_answer,
      row.level,
      row.prize_amount,
      row.category,
      row.active,
      row.report_count,
    ]
      .map(sql)
      .join(", "),
  )
  .map((valueList) => `  (${valueList})`)
  .join(",\n");

const output = `-- Final Answer Milestone 4 starter question seed.\n-- Generated by scripts/generate-question-seed.mjs.\n-- Inserts 20 active starter questions per level, 240 total.\n\ninsert into public.questions (\n  question_text,\n  answer_a,\n  answer_b,\n  answer_c,\n  answer_d,\n  correct_answer,\n  level,\n  prize_amount,\n  category,\n  active,\n  report_count\n)\nvalues\n${values}\non conflict (question_text) do update set\n  answer_a = excluded.answer_a,\n  answer_b = excluded.answer_b,\n  answer_c = excluded.answer_c,\n  answer_d = excluded.answer_d,\n  correct_answer = excluded.correct_answer,\n  level = excluded.level,\n  prize_amount = excluded.prize_amount,\n  category = excluded.category,\n  active = excluded.active;\n\nnotify pgrst, 'reload schema';\n`;

writeFileSync(
  join(process.cwd(), "supabase", "final-answer-question-seed.sql"),
  output,
);

mkdirSync(join(process.cwd(), "src", "lib", "final-answer"), {
  recursive: true,
});
writeFileSync(
  join(process.cwd(), "src", "lib", "final-answer", "starter-questions.json"),
  `${JSON.stringify(rows, null, 2)}\n`,
);

console.log(`Wrote ${rows.length} questions.`);
