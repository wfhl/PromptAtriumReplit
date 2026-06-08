import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const CardBeamAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardStreamRef = useRef<HTMLDivElement>(null);
  const cardLineRef = useRef<HTMLDivElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const scannerCanvasRef = useRef<HTMLCanvasElement>(null);

  const [speed, setSpeed] = useState(120);
  const [isAnimating, setIsAnimating] = useState(true);

  // Animation state refs
  const animationState = useRef({
    position: 0,
    velocity: 120,
    direction: -1,
    isDragging: false,
    lastTime: 0,
    lastMouseX: 0,
    mouseVelocity: 0,
    friction: 0.95,
    minVelocity: 30,
    containerWidth: 0,
    cardLineWidth: 0
  });

  // Particle systems refs
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const particleScannerRef = useRef<ParticleScanner | null>(null);

  // Card data with code content only - images generated inline
  const cardData = [
    {
      category: "1 Architecture",
      colors: ["#667eea", "#764ba2"],
      image: "/PromptCardBeamImages/0_1villa.jpg", // YOUR IMAGE HERE
      text: `// AI Architecture Generator
const generateMansion = async () => {
  const prompt = \`Luxurious mansion in Monaco villa style, 
hillside location, Mediterranean architecture, terracotta roofs, 
cream stone walls, arched balconies, grand entrance, 
lush garden, fountain, palm trees, bright daylight, 
photorealistic 8K --ar 4:3 --quality 2 --raw\`;

  const config = {
    model: "midjourney-v6",
    prompt: prompt,
    style: "architectural",
    quality: "ultra",
    lighting: "natural"
  };

  return await ai.generateImage(config);
};`
    },
    {
      category: "2 Fashion",
      colors: ["#ff6b6b", "#ee5a24"],
      image: "/PromptCardBeamImages/0_1-2.jpg", // YOUR IMAGE HERE
      text: `// Fashion Photography AI
const generateRunwayShoot = async () => {
  const prompt = \`realistic photography, glowing neon ink dragons 
over sunset body art tattoos, female model, strutting down 
Japanese fashion show runway --chaos 10 --ar 4:3 --exp 30 --raw\`;

  const photoConfig = {
    model: "midjourney-v6",
    prompt: prompt,
    style: "fashion_photography",
    chaos: 10,
    experimental: 30
  };

  return await ai.captureImage(photoConfig);
};`
    },
    {
      category: "3 Pop-up Book",
      colors: ["#4ecdc4", "#44a08d"],
      image: "/PromptCardBeamImages/0_2papercastle.jpg", // YOUR IMAGE HERE
      text: `// Pop-up Book Art Generator
const generatePopupBook = async () => {
  const prompt = \`Whimsical pop-up book illustration, fairy tale style, 
open book with spiral paper trail extending upward like ribbon, 
little girl and small animals walking along it, 
floating fairy tale castle in sky, folded paper designs, 
dreamy pastel colors, sparkling stars --ar 4:3 --raw\`;

  return await ai.createArtwork({
    style: "children_book_art",
    technique: "paper_craft",
    mood: "whimsical_dreamy"
  });
};`
    },
    {
      category: "4 Bodyart",
      colors: ["#a55eea", "#8854d0"],
      image: "/PromptCardBeamImages/0_3dragonbodyart.jpg", // YOUR IMAGE HERE
      text: `// Bodyart City Generator
const generateBodyart = async () => {
  const prompt = \`Neon-lit cyberpunk cityscape at night, 
towering skyscrapers with holographic advertisements, 
flying cars, rain-soaked streets reflecting neon lights, 
dark atmosphere, futuristic architecture, 
blade runner aesthetic --ar 16:9 --v 6\`;

  const cityConfig = {
    model: "midjourney-v6",
    atmosphere: "cyberpunk_noir",
    lighting: "neon_dramatic",
    time: "night",
    weather: "rain"
  };

  return await ai.generateScene(cityConfig);
};`
    },
    {
      category: "5 Portrait",
      colors: ["#26d0ce", "#1a9e9c"],
      image: "/PromptCardBeamImages/0_1-3.jpg", // YOUR IMAGE HERE
      text: `// Portrait Art Generator
const generateArtisticPortrait = async () => {
  const prompt = \`Ethereal portrait of woman with flowing hair, 
surrounded by floating butterflies and flower petals, 
soft watercolor style, dreamy lighting, 
pastel color palette, fantasy art, 
delicate details --ar 3:4 --stylize 1000\`;

  const portraitConfig = {
    medium: "watercolor",
    style: "fantasy_ethereal",
    colors: "pastel_palette",
    elements: ["butterflies", "flowers", "soft_light"]
  };

  return await ai.createPortrait(portraitConfig);
};`
    },
    {
      category: "6 Landscape",
      colors: ["#fed330", "#f39c12"],
      image: "/PromptCardBeamImages/0_2-3.jpg", // YOUR IMAGE HERE
      text: `// Landscape Photography AI
const generateLandscape = async () => {
  const prompt = \`Dramatic mountain landscape at golden hour, 
misty peaks, alpine lake reflection, 
dramatic clouds, rays of sunlight breaking through, 
professional landscape photography, 
ultra-wide angle, sharp details --ar 21:9\`;

  const landscapeConfig = {
    camera: "ultra_wide",
    time: "golden_hour",
    weather: "dramatic_clouds",
    composition: "rule_of_thirds"
  };

  return await ai.photographLandscape(landscapeConfig);
};`
    },
    {
      category: "7 Abstract",
      colors: ["#fa8231", "#f0932b"],
      image: "/PromptCardBeamImages/0_3.jpg", // YOUR IMAGE HERE
      text: `// Abstract Art Generator
const generateAbstract = async () => {
  const prompt = \`Fluid abstract composition with swirling colors, 
organic shapes flowing into geometric patterns, 
vibrant blues and oranges, metallic accents, 
digital art, contemporary style, 
high contrast --ar 1:1 --chaos 20\`;

  const abstractConfig = {
    style: "fluid_geometric",
    colors: ["vibrant_blue", "sunset_orange", "metallic"],
    chaos: 20,
    contrast: "high"
  };

  return await ai.createAbstract(abstractConfig);
};`
    },
    {
      category: "8 Character",
      colors: ["#6c5ce7", "#5f3dc4"],
      image: "/PromptCardBeamImages/0_1-1.jpg", // YOUR IMAGE HERE
      text: `// Character Design AI
const generateCharacter = async () => {
  const prompt = \`Fantasy warrior character design, 
intricate armor with glowing runes, 
wielding magical sword, confident pose, 
detailed concept art, 
professional game art style --ar 3:4\`;

  const characterConfig = {
    class: "warrior",
    equipment: ["runic_armor", "magical_weapon"],
    pose: "heroic_stance",
    style: "game_concept_art"
  };

  return await ai.designCharacter(characterConfig);
};`
    },
    {
      category: "9 Product",
      colors: ["#00b894", "#00a085"],
      image: "/PromptCardBeamImages/0_1.jpg", // YOUR IMAGE HERE
      text: `// Product Design Generator
const generateProduct = async () => {
  const prompt = \`Sleek modern smartphone design, 
minimalist aesthetic, premium materials, 
clean lines, innovative form factor, 
professional product photography, 
studio lighting --ar 3:4\`;

  const productConfig = {
    category: "electronics",
    style: "minimalist_premium",
    materials: ["aluminum", "glass"],
    lighting: "studio_professional"
  };

  return await ai.designProduct(productConfig);
};`
    },
    {
      category: "10 Food",
      colors: ["#fd79a8", "#e84393"],
      image: "/PromptCardBeamImages/0_20gemcake.jpg", // YOUR IMAGE HERE
      text: `// Food Photography AI
const generateFoodPhoto = async () => {
  const prompt = \`Gourmet dish presentation, 
colorful ingredients artfully arranged, 
shallow depth of field, warm lighting, 
professional food photography, 
appetizing and vibrant --ar 4:5\`;

  const foodConfig = {
    style: "gourmet_presentation",
    lighting: "warm_natural",
    composition: "artistic_plating",
    camera: "macro_lens"
  };

  return await ai.photographFood(foodConfig);
};`
    },
    {
      category: "11 Space",
      colors: ["#0984e3", "#74b9ff"],
      image: "/PromptCardBeamImages/0_1-8.jpg", // YOUR IMAGE HERE
      text: `// Space Art Generator
const generateSpaceScene = async () => {
  const prompt = \`Vast cosmic nebula with swirling gases, 
distant galaxies, bright stars, 
colorful space clouds in purple and blue, 
astronomical photography style, 
deep space beauty --ar 16:9\`;

  const spaceConfig = {
    objects: ["nebula", "galaxies", "star_clusters"],
    colors: ["cosmic_purple", "deep_blue", "stellar_white"],
    scale: "astronomical",
    style: "hubble_telescope"
  };

  return await ai.renderCosmos(spaceConfig);
};`
    },
    {
      category: "12 Retro",
      colors: ["#e17055", "#d63031"],
      image: "/PromptCardBeamImages/0_1-7.jpg", // YOUR IMAGE HERE
      text: `// Retro Art Generator
const generateRetroArt = async () => {
  const prompt = \`80s retro synthwave aesthetic, 
neon grid landscape, purple and pink gradient sky, 
chrome text effects, vintage computer graphics, 
outrun style, nostalgic atmosphere --ar 16:9\`;

  const retroConfig = {
    era: "1980s",
    style: "synthwave_outrun",
    colors: ["neon_pink", "electric_purple", "chrome"],
    elements: ["grid_landscape", "gradient_sky"]
  };

  return await ai.createRetroArt(retroConfig);
};`
    },
    {
      category: "13 Wildlife",
      colors: ["#00cec9", "#55a3ff"],
      image: "/PromptCardBeamImages/0_3-2.jpg", // YOUR IMAGE HERE
      text: `// Wildlife Photography AI
const generateWildlife = async () => {
  const prompt = \`Majestic tiger in natural habitat, 
intense eye contact, perfect lighting, 
shallow depth of field, 
wildlife photography masterpiece, 
National Geographic style --ar 3:2\`;

  const wildlifeConfig = {
    subject: "big_cat",
    habitat: "natural_environment",
    lighting: "golden_hour",
    style: "national_geographic"
  };

  return await ai.captureWildlife(wildlifeConfig);
};`
    },
    {
      category: "14 Urbanpunk",
      colors: ["#fdcb6e", "#e17055"],
      image: "/PromptCardBeamImages/0_0.jpg", // YOUR IMAGE HERE
      text: `// Urbanpunk Design Generator
const generateUrbanpunk = async () => {
  const prompt = \`Intricate steampunk mechanical device, 
brass gears and copper pipes, 
Victorian-era industrial design, 
detailed craftsmanship, 
sepia-toned photography --ar 4:3\`;

  const steampunkConfig = {
    materials: ["brass", "copper", "steel"],
    era: "victorian_industrial",
    complexity: "highly_detailed",
    tone: "sepia_vintage"
  };

  return await ai.designSteampunk(steampunkConfig);
};`
    },
    {
      category: "15 Minimalist",
      colors: ["#81ecec", "#00b894"],
      image: "/PromptCardBeamImages/0_1-4.jpg", // YOUR IMAGE HERE
      text: `// Minimalist Art Generator
const generateMinimalist = async () => {
  const prompt = \`Clean minimalist composition, 
geometric shapes in soft pastels, 
negative space emphasis, 
modern contemporary art style, 
serene and balanced --ar 1:1\`;

  const minimalistConfig = {
    style: "geometric_minimal",
    colors: "soft_pastels",
    composition: "negative_space",
    mood: "serene_balanced"
  };

  return await ai.createMinimal(minimalistConfig);
};`
    },
    {
      category: "16 Horror",
      colors: ["#2d3436", "#636e72"],
      image: "/PromptCardBeamImages/0_2-4.jpg", // YOUR IMAGE HERE
      text: `// Horror Art Generator
const generateHorrorArt = async () => {
  const prompt = \`Dark gothic cathedral interior, 
eerie shadows and candlelight, 
mysterious hooded figure, 
atmospheric horror scene, 
cinematic lighting --ar 9:16\`;

  const horrorConfig = {
    setting: "gothic_cathedral",
    lighting: "dramatic_shadows",
    mood: "eerie_mysterious",
    style: "cinematic_horror"
  };

  return await ai.createHorror(horrorConfig);
};`
    },
    {
      category: "17 Underwater",
      colors: ["#00b894", "#55efc4"],
      image: "/PromptCardBeamImages/0_0-3.jpg", // YOUR IMAGE HERE
      text: `// Underwater Scene Generator
const generateUnderwater = async () => {
  const prompt = \`Vibrant coral reef ecosystem, 
tropical fish swimming through, 
crystal clear blue water, 
sunlight filtering from above, 
underwater photography --ar 16:9\`;

  const underwaterConfig = {
    ecosystem: "coral_reef",
    wildlife: "tropical_fish",
    lighting: "sunbeam_filtering",
    clarity: "crystal_clear"
  };

  return await ai.renderUnderwater(underwaterConfig);
};`
    },
    {
      category: "18 Anime",
      colors: ["#ff7675", "#fab1a0"],
      image: "/PromptCardBeamImages/0_2-1.jpg", // YOUR IMAGE HERE
      text: `// Anime Style Generator
const generateAnimeArt = async () => {
  const prompt = \`Anime character with large expressive eyes, 
colorful hair flowing in wind, 
cherry blossom background, 
studio ghibli inspired style, 
soft cel-shaded animation --ar 3:4\`;

  const animeConfig = {
    style: "studio_ghibli",
    character: "expressive_eyes",
    background: "cherry_blossoms",
    technique: "cel_shading"
  };

  return await ai.createAnime(animeConfig);
};`
    },
    {
      category: "19 Macro",
      colors: ["#a29bfe", "#6c5ce7"],
      image: "/PromptCardBeamImages/0_1-6.jpg", // YOUR IMAGE HERE
      text: `// Macro Photography AI
const generateMacro = async () => {
  const prompt = \`Extreme macro photography of dewdrop on flower petal, 
perfect sphere reflecting garden scene, 
shallow depth of field, 
natural morning light, 
crystal clear details --ar 1:1\`;

  const macroConfig = {
    subject: "water_droplet",
    surface: "flower_petal",
    lighting: "natural_morning",
    focus: "extreme_close_up"
  };

  return await ai.captureMacro(macroConfig);
};`
    },
    {
      category: "20 Fantasy",
      colors: ["#00b894", "#55a3ff"],
      image: "/PromptCardBeamImages/0_0-2.jpg", // YOUR IMAGE HERE
      text: `// Fantasy Environment Generator
const generateFantasyWorld = async () => {
  const prompt = \`Magical forest with glowing mushrooms, 
floating islands in misty sky, 
ancient trees with spiral branches, 
ethereal lighting effects, 
fantasy concept art --ar 21:9\`;

  const fantasyConfig = {
    environment: "magical_forest",
    elements: ["glowing_flora", "floating_islands"],
    lighting: "ethereal_mystical",
    style: "fantasy_concept"
  };

  return await ai.worldBuild(fantasyConfig);
};`
    }
  ];

  // Format text for display
  const formatTextForDisplay = (text: string, width: number, height: number) => {
    const lines = text.split('\n');
    let formattedLines = [];

    for (let line of lines) {
      if (line.length <= width) {
        formattedLines.push(line.padEnd(width));
      } else {
        // Split long lines
        for (let i = 0; i < line.length; i += width) {
          let chunk = line.slice(i, i + width);
          formattedLines.push(chunk.padEnd(width));
        }
      }
    }

    // Ensure we have enough lines
    while (formattedLines.length < height) {
      formattedLines.push(' '.repeat(width));
    }

    // Truncate if too many lines
    if (formattedLines.length > height) {
      formattedLines = formattedLines.slice(0, height);
    }

    return formattedLines.join('\n');
  };

  // Calculate code dimensions
  const calculateCodeDimensions = (cardWidth: number, cardHeight: number) => {
    const fontSize = 11;
    const lineHeight = 13;
    const charWidth = 6;
    const width = Math.floor(cardWidth / charWidth);
    const height = Math.floor(cardHeight / lineHeight);
    return { width, height, fontSize, lineHeight };
  };

  // Create canvas image inline
  const createCardImage = (category: string, colors: string[]) => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 250;
    const ctx = canvas.getContext("2d")!;

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 400, 250);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 250);

    // Add label text with better styling
    ctx.fillStyle = "white";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(category, 200, 130);

    // Add subtitle
    ctx.font = "14px Arial";
    ctx.fillText("AI Generator", 200, 155);

    return canvas.toDataURL();
  };

  // Create card wrapper
  const createCardWrapper = (index: number) => {
    const wrapper = document.createElement("div");
    wrapper.className = "card-wrapper";
    wrapper.setAttribute("data-card-index", index as unknown as string);

    const normalCard = document.createElement("div");
    normalCard.className = "card card-normal";

    const cardImage = document.createElement("img");
    cardImage.className = "card-image";

    // Get card data for this index
    const cardInfo = cardData[index % cardData.length];

    // Try to load actual image first, fallback to canvas if it fails
    if (cardInfo.image) {
      cardImage.src = cardInfo.image;
      cardImage.alt = cardInfo.category;

      // Fallback to canvas placeholder if image fails to load
      cardImage.onerror = () => {
        cardImage.src = createCardImage(cardInfo.category, cardInfo.colors);
      };
    } else {
      // No image provided, use canvas placeholder
      cardImage.src = createCardImage(cardInfo.category, cardInfo.colors);
      cardImage.alt = cardInfo.category;
    }

    normalCard.appendChild(cardImage);

    const asciiCard = document.createElement("div");
    asciiCard.className = "card card-ascii";

    const asciiContent = document.createElement("div");
    asciiContent.className = "ascii-content";

    const { width, height, fontSize, lineHeight } = calculateCodeDimensions(400, 250);
    asciiContent.style.fontSize = fontSize + "px";
    asciiContent.style.lineHeight = lineHeight + "px";

    asciiContent.textContent = formatTextForDisplay(cardInfo.text, width, height);

    asciiCard.appendChild(asciiContent);
    wrapper.appendChild(normalCard);
    wrapper.appendChild(asciiCard);

    return wrapper;
  };

  // Calculate dimensions
  const calculateDimensions = () => {
    if (cardStreamRef.current && cardLineRef.current) {
      animationState.current.containerWidth = cardStreamRef.current.offsetWidth;
      const cardWidth = 400;
      const cardGap = 60;
      const cardCount = cardLineRef.current.children.length;
      animationState.current.cardLineWidth = (cardWidth + cardGap) * cardCount;
    }
  };

  // Update card clipping
  const updateCardClipping = () => {
    const scannerX = window.innerWidth / 2;
    const scannerWidth = 8;
    const scannerLeft = scannerX - scannerWidth / 2;
    const scannerRight = scannerX + scannerWidth / 2;
    let anyScanningActive = false;

    if (cardLineRef.current) {
      const wrappers = cardLineRef.current.querySelectorAll<HTMLElement>(".card-wrapper");
      wrappers.forEach((wrapper) => {
        const rect = wrapper.getBoundingClientRect();
        const cardLeft = rect.left;
        const cardRight = rect.right;
        const cardWidth = rect.width;

        const normalCard = wrapper.querySelector(".card-normal") as HTMLElement;
        const asciiCard = wrapper.querySelector(".card-ascii") as HTMLElement;

        if (cardLeft < scannerRight && cardRight > scannerLeft) {
          anyScanningActive = true;
          const scannerIntersectLeft = Math.max(scannerLeft - cardLeft, 0);
          const scannerIntersectRight = Math.min(scannerRight - cardLeft, cardWidth);

          const normalClipRight = (scannerIntersectLeft / cardWidth) * 100;
          const asciiClipLeft = (scannerIntersectRight / cardWidth) * 100;

          normalCard.style.setProperty("--clip-right", `${normalClipRight}%`);
          asciiCard.style.setProperty("--clip-left", `${asciiClipLeft}%`);

          if (!wrapper.hasAttribute("data-scanned") && scannerIntersectLeft > 0) {
            wrapper.setAttribute("data-scanned", "true");
            const scanEffect = document.createElement("div");
            scanEffect.className = "scan-effect";
            wrapper.appendChild(scanEffect);
            setTimeout(() => {
              if (scanEffect.parentNode) {
                scanEffect.parentNode.removeChild(scanEffect);
              }
            }, 600);
          }
        } else {
          if (cardRight < scannerLeft) {
            normalCard.style.setProperty("--clip-right", "100%");
            asciiCard.style.setProperty("--clip-left", "100%");
          } else if (cardLeft > scannerRight) {
            normalCard.style.setProperty("--clip-right", "0%");
            asciiCard.style.setProperty("--clip-left", "0%");
          }
          wrapper.removeAttribute("data-scanned");
        }
      });
    }

    if (particleScannerRef.current) {
      particleScannerRef.current.setScanningActive(anyScanningActive);
    }
  };

  // Update card position
  const updateCardPosition = () => {
    const { containerWidth, cardLineWidth, position } = animationState.current;

    if (position < -cardLineWidth) {
      animationState.current.position = containerWidth;
    } else if (position > containerWidth) {
      animationState.current.position = -cardLineWidth;
    }

    if (cardLineRef.current) {
      cardLineRef.current.style.transform = `translateX(${animationState.current.position}px)`;
    }
    updateCardClipping();
  };

  // Animation loop
  const animate = () => {
    const currentTime = performance.now();
    const deltaTime = (currentTime - animationState.current.lastTime) / 1000;
    animationState.current.lastTime = currentTime;

    if (isAnimating && !animationState.current.isDragging) {
      if (animationState.current.velocity > animationState.current.minVelocity) {
        animationState.current.velocity *= animationState.current.friction;
      } else {
        animationState.current.velocity = Math.max(animationState.current.minVelocity, animationState.current.velocity);
      }

      animationState.current.position += animationState.current.velocity * animationState.current.direction * deltaTime;
      updateCardPosition();
      setSpeed(Math.round(animationState.current.velocity));
    }

    requestAnimationFrame(animate);
  };

  // Event handlers
  const startDrag = (e: any) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    animationState.current.isDragging = true;
    setIsAnimating(false);
    animationState.current.lastMouseX = e.clientX || e.pageX || 0;
    animationState.current.mouseVelocity = 0;

    if (cardLineRef.current) {
      const transform = window.getComputedStyle(cardLineRef.current).transform;
      if (transform !== "none") {
        const matrix = new DOMMatrix(transform);
        animationState.current.position = matrix.m41;
      }

      cardLineRef.current.style.animation = "none";
      cardLineRef.current.classList.add("dragging");
    }

    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
  };

  const onDrag = (e: any) => {
    if (!animationState.current.isDragging) return;
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    const clientX = e.clientX || e.pageX || 0;
    const deltaX = clientX - animationState.current.lastMouseX;
    animationState.current.position += deltaX;
    animationState.current.mouseVelocity = deltaX * 60;
    animationState.current.lastMouseX = clientX;

    if (cardLineRef.current) {
      cardLineRef.current.style.transform = `translateX(${animationState.current.position}px)`;
    }
    updateCardClipping();
  };

  const endDrag = () => {
    if (!animationState.current.isDragging) return;

    animationState.current.isDragging = false;
    if (cardLineRef.current) {
      cardLineRef.current.classList.remove("dragging");
    }

    if (Math.abs(animationState.current.mouseVelocity) > animationState.current.minVelocity) {
      animationState.current.velocity = Math.abs(animationState.current.mouseVelocity);
      animationState.current.direction = animationState.current.mouseVelocity > 0 ? 1 : -1;
    } else {
      animationState.current.velocity = 120;
    }

    setIsAnimating(true);
    setSpeed(Math.round(animationState.current.velocity));

    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  };

  const onWheel = (e: any) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    const scrollSpeed = 20;
    const delta = e.deltaY > 0 ? scrollSpeed : -scrollSpeed;
    animationState.current.position += delta;
    updateCardPosition();
  };

  // Control functions
  const toggleAnimation = () => {
    setIsAnimating(!isAnimating);
    if (cardLineRef.current && !isAnimating) {
      cardLineRef.current.style.animation = "none";
    }
  };

  const resetPosition = () => {
    animationState.current.position = animationState.current.containerWidth;
    animationState.current.velocity = 120;
    animationState.current.direction = -1;
    animationState.current.isDragging = false;
    setIsAnimating(true);
    setSpeed(120);

    if (cardLineRef.current) {
      cardLineRef.current.style.animation = "none";
      cardLineRef.current.style.transform = `translateX(${animationState.current.position}px)`;
      cardLineRef.current.classList.remove("dragging");
    }
  };

  const changeDirection = () => {
    animationState.current.direction *= -1;
  };

  // Populate cards
  const populateCardLine = () => {
    if (cardLineRef.current) {
      cardLineRef.current.innerHTML = "";
      const cardsCount = 30;
      for (let i = 0; i < cardsCount; i++) {
        const cardWrapper = createCardWrapper(i);
        cardLineRef.current.appendChild(cardWrapper);
      }
    }
  };

  // Update ASCII content with subtle glitch effects
  const updateAsciiContent = () => {
    if (cardLineRef.current) {
      const wrappers = cardLineRef.current.querySelectorAll<HTMLElement>(".card-wrapper");
      wrappers.forEach((wrapper) => {
        const content = wrapper.querySelector(".ascii-content");
        if (content && Math.random() < 0.15) {
          const cardIndex = parseInt(wrapper.getAttribute("data-card-index")!);
          const cardInfo = cardData[cardIndex % cardData.length];
          const { width, height } = calculateCodeDimensions(400, 250);

          // Add some variation to the text display for the glitch effect
          let displayText = cardInfo.text;
          if (Math.random() < 0.3) {
            // Occasionally add some glitch characters for effect
            const glitchChars = "▓▒░";
            const randomChar = glitchChars[Math.floor(Math.random() * glitchChars.length)];
            displayText = displayText.replace(/./g, (char, index) => {
              return Math.random() < 0.02 ? randomChar : char;
            });
          }

          content.textContent = formatTextForDisplay(displayText, width, height);
        }
      });
    }
  };

  // Particle System Class
  class ParticleSystem {
    scene!: THREE.Scene;
    camera!: THREE.OrthographicCamera;
    renderer!: THREE.WebGLRenderer;
    particles: THREE.Points | null;
    particleCount: number;
    canvas: HTMLCanvasElement;
    animationId: number | null;
    velocities!: Float32Array;
    alphas!: Float32Array;

    constructor(canvas: HTMLCanvasElement) {
      this.scene = null as any;
      this.camera = null as any;
      this.renderer = null as any;
      this.particles = null;
      this.particleCount = 400;
      this.canvas = canvas;
      this.animationId = null;

      this.init();
    }

    init() {
      try {
        if (typeof THREE === 'undefined') {
          throw new Error('THREE.js is not loaded');
        }
        
        this.scene = new THREE.Scene();

        this.camera = new THREE.OrthographicCamera(
          -window.innerWidth / 2,
          window.innerWidth / 2,
          125,
          -125,
          1,
          1000
        );
        this.camera.position.z = 100;

        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          alpha: true,
          antialias: true,
        });
        this.renderer.setSize(window.innerWidth, 250);
        this.renderer.setClearColor(0x000000, 0);

        this.createParticles();
        this.animate();

        window.addEventListener("resize", () => this.onWindowResize());
      } catch (error) {
        console.warn('Failed to initialize Three.js particle system:', error);
        throw error; // Re-throw to be caught by the parent
      }
    }

    createParticles() {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(this.particleCount * 3);
      const colors = new Float32Array(this.particleCount * 3);
      const sizes = new Float32Array(this.particleCount);
      const velocities = new Float32Array(this.particleCount);

      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext("2d")!;

      const half = canvas.width / 2;
      const hue = 217;

      const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
      gradient.addColorStop(0.025, "#fff");
      gradient.addColorStop(0.1, `hsl(${hue}, 61%, 33%)`);
      gradient.addColorStop(0.25, `hsl(${hue}, 64%, 6%)`);
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(half, half, half, 0, Math.PI * 2);
      ctx.fill();

      const texture = new THREE.CanvasTexture(canvas);

      for (let i = 0; i < this.particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * window.innerWidth * 2;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 250;
        positions[i * 3 + 2] = 0;

        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;

        const orbitRadius = Math.random() * 200 + 100;
        sizes[i] = (Math.random() * (orbitRadius - 60) + 60) / 8;

        velocities[i] = Math.random() * 60 + 30;
      }

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

      this.velocities = velocities;

      const alphas = new Float32Array(this.particleCount);
      for (let i = 0; i < this.particleCount; i++) {
        alphas[i] = (Math.random() * 8 + 2) / 10;
      }
      geometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
      this.alphas = alphas;

      const material = new THREE.ShaderMaterial({
        uniforms: {
          pointTexture: { value: texture },
          size: { value: 15.0 },
        },
        vertexShader: `
          attribute float alpha;
          varying float vAlpha;
          varying vec3 vColor;
          uniform float size;

          void main() {
            vAlpha = alpha;
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size;
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform sampler2D pointTexture;
          varying float vAlpha;
          varying vec3 vColor;

          void main() {
            gl_FragColor = vec4(vColor, vAlpha) * texture2D(pointTexture, gl_PointCoord);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
      });

      this.particles = new THREE.Points(geometry, material);
      this.scene.add(this.particles);
    }

    animate() {
      this.animationId = requestAnimationFrame(() => this.animate());

      if (this.particles) {
        const positions = this.particles.geometry.attributes.position.array;
        const alphas = this.particles.geometry.attributes.alpha.array;
        const time = Date.now() * 0.001;

        for (let i = 0; i < this.particleCount; i++) {
          positions[i * 3] += this.velocities[i] * 0.016;

          if (positions[i * 3] > window.innerWidth / 2 + 100) {
            positions[i * 3] = -window.innerWidth / 2 - 100;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 250;
          }

          positions[i * 3 + 1] += Math.sin(time + i * 0.1) * 0.5;

          const twinkle = Math.floor(Math.random() * 10);
          if (twinkle === 1 && alphas[i] > 0) {
            alphas[i] -= 0.05;
          } else if (twinkle === 2 && alphas[i] < 1) {
            alphas[i] += 0.05;
          }

          alphas[i] = Math.max(0, Math.min(1, alphas[i]));
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.geometry.attributes.alpha.needsUpdate = true;
      }

      this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
      this.camera.left = -window.innerWidth / 2;
      this.camera.right = window.innerWidth / 2;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(window.innerWidth, 250);
    }

    destroy() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      if (this.renderer) {
        this.renderer.dispose();
      }
      if (this.particles) {
        this.scene.remove(this.particles);
        this.particles.geometry.dispose();
        (this.particles.material as THREE.Material).dispose();
      }
    }
  }

  // Particle Scanner Class
  class ParticleScanner {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    animationId: number | null;
    w!: number;
    h!: number;
    particles!: any[];
    count!: number;
    maxParticles!: number;
    intensity!: number;
    lightBarX!: number;
    lightBarWidth!: number;
    fadeZone!: number;
    scanTargetIntensity!: number;
    scanTargetParticles!: number;
    scanTargetFadeZone!: number;
    scanningActive!: boolean;
    baseIntensity!: number;
    baseMaxParticles!: number;
    baseFadeZone!: number;
    currentIntensity!: number;
    currentMaxParticles!: number;
    currentFadeZone!: number;
    transitionSpeed!: number;
    currentGlowIntensity!: number;
    gradientCanvas!: HTMLCanvasElement;
    gradientCtx!: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
      this.canvas = canvas;
      this.ctx = this.canvas.getContext("2d")!;
      this.animationId = null;

      this.w = window.innerWidth;
      this.h = 300;
      this.particles = [];
      this.count = 0;
      this.maxParticles = 800;
      this.intensity = 0.8;
      this.lightBarX = this.w / 2;
      this.lightBarWidth = 3;
      this.fadeZone = 60;

      this.scanTargetIntensity = 1.8;
      this.scanTargetParticles = 2500;
      this.scanTargetFadeZone = 35;

      this.scanningActive = false;

      this.baseIntensity = this.intensity;
      this.baseMaxParticles = this.maxParticles;
      this.baseFadeZone = this.fadeZone;

      this.currentIntensity = this.intensity;
      this.currentMaxParticles = this.maxParticles;
      this.currentFadeZone = this.fadeZone;
      this.transitionSpeed = 0.05;

      this.setupCanvas();
      this.createGradientCache();
      this.initParticles();
      this.animate();

      window.addEventListener("resize", () => this.onResize());
    }

    setupCanvas() {
      this.canvas.width = this.w;
      this.canvas.height = this.h;
      this.canvas.style.width = this.w + "px";
      this.canvas.style.height = this.h + "px";
      this.ctx.clearRect(0, 0, this.w, this.h);
    }

    onResize() {
      this.w = window.innerWidth;
      this.lightBarX = this.w / 2;
      this.setupCanvas();
    }

    createGradientCache() {
      this.gradientCanvas = document.createElement("canvas");
      this.gradientCtx = this.gradientCanvas.getContext("2d")!;
      this.gradientCanvas.width = 16;
      this.gradientCanvas.height = 16;

      const half = this.gradientCanvas.width / 2;
      const gradient = this.gradientCtx.createRadialGradient(half, half, 0, half, half, half);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.3, "rgba(196, 181, 253, 0.8)");
      gradient.addColorStop(0.7, "rgba(139, 92, 246, 0.4)");
      gradient.addColorStop(1, "transparent");

      this.gradientCtx.fillStyle = gradient;
      this.gradientCtx.beginPath();
      this.gradientCtx.arc(half, half, half, 0, Math.PI * 2);
      this.gradientCtx.fill();
    }

    randomFloat(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    createParticle() {
      const intensityRatio = this.intensity / this.baseIntensity;
      const speedMultiplier = 1 + (intensityRatio - 1) * 1.2;
      const sizeMultiplier = 1 + (intensityRatio - 1) * 0.7;

      return {
        x: this.lightBarX + this.randomFloat(-this.lightBarWidth / 2, this.lightBarWidth / 2),
        y: this.randomFloat(0, this.h),
        vx: this.randomFloat(0.2, 1.0) * speedMultiplier,
        vy: this.randomFloat(-0.15, 0.15) * speedMultiplier,
        radius: this.randomFloat(0.4, 1) * sizeMultiplier,
        alpha: this.randomFloat(0.6, 1),
        decay: this.randomFloat(0.005, 0.025) * (2 - intensityRatio * 0.5),
        originalAlpha: 0,
        life: 1.0,
        time: 0,
        startX: 0,
        twinkleSpeed: this.randomFloat(0.02, 0.08) * speedMultiplier,
        twinkleAmount: this.randomFloat(0.1, 0.25),
      };
    }

    initParticles() {
      for (let i = 0; i < this.maxParticles; i++) {
        const particle = this.createParticle();
        particle.originalAlpha = particle.alpha;
        particle.startX = particle.x;
        this.count++;
        this.particles[this.count] = particle;
      }
    }

    updateParticle(particle: any) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.time++;

      particle.alpha =
        particle.originalAlpha * particle.life +
        Math.sin(particle.time * particle.twinkleSpeed) * particle.twinkleAmount;

      particle.life -= particle.decay;

      if (particle.x > this.w + 10 || particle.life <= 0) {
        this.resetParticle(particle);
      }
    }

    resetParticle(particle: any) {
      particle.x = this.lightBarX + this.randomFloat(-this.lightBarWidth / 2, this.lightBarWidth / 2);
      particle.y = this.randomFloat(0, this.h);
      particle.vx = this.randomFloat(0.2, 1.0);
      particle.vy = this.randomFloat(-0.15, 0.15);
      particle.alpha = this.randomFloat(0.6, 1);
      particle.originalAlpha = particle.alpha;
      particle.life = 1.0;
      particle.time = 0;
      particle.startX = particle.x;
    }

    drawParticle(particle: any) {
      if (particle.life <= 0) return;

      let fadeAlpha = 1;

      if (particle.y < this.fadeZone) {
        fadeAlpha = particle.y / this.fadeZone;
      } else if (particle.y > this.h - this.fadeZone) {
        fadeAlpha = (this.h - particle.y) / this.fadeZone;
      }

      fadeAlpha = Math.max(0, Math.min(1, fadeAlpha));

      this.ctx.globalAlpha = particle.alpha * fadeAlpha;
      this.ctx.drawImage(
        this.gradientCanvas,
        particle.x - particle.radius,
        particle.y - particle.radius,
        particle.radius * 2,
        particle.radius * 2
      );
    }

    drawLightBar() {
      const verticalGradient = this.ctx.createLinearGradient(0, 0, 0, this.h);
      verticalGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
      verticalGradient.addColorStop(this.fadeZone / this.h, "rgba(255, 255, 255, 1)");
      verticalGradient.addColorStop(1 - this.fadeZone / this.h, "rgba(255, 255, 255, 1)");
      verticalGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      this.ctx.globalCompositeOperation = "lighter";

      const targetGlowIntensity = this.scanningActive ? 3.5 : 1;

      if (!this.currentGlowIntensity) this.currentGlowIntensity = 1;

      this.currentGlowIntensity +=
        (targetGlowIntensity - this.currentGlowIntensity) * this.transitionSpeed;

      const glowIntensity = this.currentGlowIntensity;
      const lineWidth = this.lightBarWidth;
      const glow1Alpha = this.scanningActive ? 1.0 : 0.8;
      const glow2Alpha = this.scanningActive ? 0.8 : 0.6;
      const glow3Alpha = this.scanningActive ? 0.6 : 0.4;

      // Core gradient
      const coreGradient = this.ctx.createLinearGradient(
        this.lightBarX - lineWidth / 2, 0,
        this.lightBarX + lineWidth / 2, 0
      );
      coreGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
      coreGradient.addColorStop(0.3, `rgba(255, 255, 255, ${0.9 * glowIntensity})`);
      coreGradient.addColorStop(0.5, `rgba(255, 255, 255, ${1 * glowIntensity})`);
      coreGradient.addColorStop(0.7, `rgba(255, 255, 255, ${0.9 * glowIntensity})`);
      coreGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      this.ctx.globalAlpha = 1;
      this.ctx.fillStyle = coreGradient;
      this.ctx.fillRect(this.lightBarX - lineWidth / 2, 0, lineWidth, this.h);

      // Glow layers
      const glow1Gradient = this.ctx.createLinearGradient(
        this.lightBarX - lineWidth * 2, 0,
        this.lightBarX + lineWidth * 2, 0
      );
      glow1Gradient.addColorStop(0, "rgba(139, 92, 246, 0)");
      glow1Gradient.addColorStop(0.5, `rgba(196, 181, 253, ${0.8 * glowIntensity})`);
      glow1Gradient.addColorStop(1, "rgba(139, 92, 246, 0)");

      this.ctx.globalAlpha = glow1Alpha;
      this.ctx.fillStyle = glow1Gradient;
      this.ctx.fillRect(this.lightBarX - lineWidth * 2, 0, lineWidth * 4, this.h);

      const glow2Gradient = this.ctx.createLinearGradient(
        this.lightBarX - lineWidth * 4, 0,
        this.lightBarX + lineWidth * 4, 0
      );
      glow2Gradient.addColorStop(0, "rgba(139, 92, 246, 0)");
      glow2Gradient.addColorStop(0.5, `rgba(139, 92, 246, ${0.4 * glowIntensity})`);
      glow2Gradient.addColorStop(1, "rgba(139, 92, 246, 0)");

      this.ctx.globalAlpha = glow2Alpha;
      this.ctx.fillStyle = glow2Gradient;
      this.ctx.fillRect(this.lightBarX - lineWidth * 4, 0, lineWidth * 8, this.h);

      if (this.scanningActive) {
        const glow3Gradient = this.ctx.createLinearGradient(
          this.lightBarX - lineWidth * 8, 0,
          this.lightBarX + lineWidth * 8, 0
        );
        glow3Gradient.addColorStop(0, "rgba(139, 92, 246, 0)");
        glow3Gradient.addColorStop(0.5, "rgba(139, 92, 246, 0.2)");
        glow3Gradient.addColorStop(1, "rgba(139, 92, 246, 0)");

        this.ctx.globalAlpha = glow3Alpha;
        this.ctx.fillStyle = glow3Gradient;
        this.ctx.fillRect(this.lightBarX - lineWidth * 8, 0, lineWidth * 16, this.h);
      }

      this.ctx.globalCompositeOperation = "destination-in";
      this.ctx.globalAlpha = 1;
      this.ctx.fillStyle = verticalGradient;
      this.ctx.fillRect(0, 0, this.w, this.h);
    }

    render() {
      const targetIntensity = this.scanningActive ? this.scanTargetIntensity : this.baseIntensity;
      const targetMaxParticles = this.scanningActive ? this.scanTargetParticles : this.baseMaxParticles;
      const targetFadeZone = this.scanningActive ? this.scanTargetFadeZone : this.baseFadeZone;

      this.currentIntensity += (targetIntensity - this.currentIntensity) * this.transitionSpeed;
      this.currentMaxParticles += (targetMaxParticles - this.currentMaxParticles) * this.transitionSpeed;
      this.currentFadeZone += (targetFadeZone - this.currentFadeZone) * this.transitionSpeed;

      this.intensity = this.currentIntensity;
      this.maxParticles = Math.floor(this.currentMaxParticles);
      this.fadeZone = this.currentFadeZone;

      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.clearRect(0, 0, this.w, this.h);

      this.drawLightBar();

      this.ctx.globalCompositeOperation = "lighter";
      for (let i = 1; i <= this.count; i++) {
        if (this.particles[i]) {
          this.updateParticle(this.particles[i]);
          this.drawParticle(this.particles[i]);
        }
      }

      if (Math.random() < this.intensity && this.count < this.maxParticles) {
        const particle = this.createParticle();
        particle.originalAlpha = particle.alpha;
        particle.startX = particle.x;
        this.count++;
        this.particles[this.count] = particle;
      }

      // Additional particle generation based on intensity
      const intensityRatio = this.intensity / this.baseIntensity;
      if (intensityRatio > 1.1 && Math.random() < (intensityRatio - 1.0) * 1.2) {
        const particle = this.createParticle();
        particle.originalAlpha = particle.alpha;
        particle.startX = particle.x;
        this.count++;
        this.particles[this.count] = particle;
      }

      if (this.count > this.maxParticles + 200) {
        const excessCount = Math.min(15, this.count - this.maxParticles);
        for (let i = 0; i < excessCount; i++) {
          delete this.particles[this.count - i];
        }
        this.count -= excessCount;
      }
    }

    animate() {
      this.render();
      this.animationId = requestAnimationFrame(() => this.animate());
    }

    setScanningActive(active: boolean) {
      this.scanningActive = active;
    }

    destroy() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.particles = [];
      this.count = 0;
    }
  }

  // Initialize everything
  useEffect(() => {
    if (particleCanvasRef.current && scannerCanvasRef.current) {
      try {
        // Initialize particle systems
        particleSystemRef.current = new ParticleSystem(particleCanvasRef.current);
        particleScannerRef.current = new ParticleScanner(scannerCanvasRef.current);
      } catch (error) {
        console.warn('WebGL not available or Three.js initialization failed:', error);
        // Continue without particle effects
        particleSystemRef.current = null;
        particleScannerRef.current = null;
      }

      // Populate cards
      populateCardLine();
      calculateDimensions();

      // Start animation loop
      animationState.current.lastTime = performance.now();
      animate();

      // Start periodic updates
      const asciiUpdateInterval = setInterval(updateAsciiContent, 200);
      const clippingUpdateLoop = () => {
        updateCardClipping();
        requestAnimationFrame(clippingUpdateLoop);
      };
      clippingUpdateLoop();

      // Event listeners
      const handleMouseMove = (e: any) => onDrag(e);
      const handleMouseUp = () => endDrag();
      const handleTouchMove = (e: any) => onDrag(e.touches[0]);
      const handleTouchEnd = () => endDrag();
      const handleResize = () => calculateDimensions();

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('resize', handleResize);

      return () => {
        // Cleanup
        clearInterval(asciiUpdateInterval);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('resize', handleResize);

        if (particleSystemRef.current) {
          particleSystemRef.current.destroy();
        }
        if (particleScannerRef.current) {
          particleScannerRef.current.destroy();
        }
      };
    }
  }, []);

  // Handle card line events
  const handleCardLineMouseDown = (e: any) => startDrag(e);
  const handleCardLineTouchStart = (e: any) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (e.touches && e.touches[0]) {
      startDrag(e.touches[0]);
    }
  };
  const handleCardLineWheel = (e: any) => onWheel(e);

  return (
    <div className="prompt-beam-container" style={{ 
      margin: 0, 
      padding: 0, 
      background: 'transparent', 
      width: '100%',
      overflow: 'hidden', 
      fontFamily: 'Arial, sans-serif',
      position: 'relative',
      borderRadius: '12px' // Add some visual polish
    }}>
      {/* Container */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Particle Canvas */}
        <canvas
          ref={particleCanvasRef}
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            transform: 'translateY(-50%)',
            width: '100%',
            height: '250px',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />

        {/* Scanner Canvas */}
        <canvas
          ref={scannerCanvasRef}
          style={{
            position: 'absolute',
            top: '50%',
            left: '-3px',
            transform: 'translateY(-50%)',
            width: '100%',
            height: '300px',
            zIndex: 15,
            pointerEvents: 'none'
          }}
        />

        {/* Card Stream */}
        <div
          ref={cardStreamRef}
          style={{
            position: 'absolute',
            width: '100%',
            height: '180px',
            display: 'flex',
            alignItems: 'center',
            overflow: 'visible'
          }}
        >
          <div
            ref={cardLineRef}
            onMouseDown={handleCardLineMouseDown}
            onTouchStart={handleCardLineTouchStart}
            onWheel={handleCardLineWheel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '60px',
              whiteSpace: 'nowrap',
              cursor: 'grab',
              userSelect: 'none',
              willChange: 'transform'
            }}
          />
        </div>
      </div>

      {/* CSS Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .card-wrapper {
          position: relative;
          width: 400px;
          height: 250px;
          flex-shrink: 0;
        }

        .card {
          position: absolute;
          top: 0;
          left: 0;
          width: 400px;
          height: 250px;
          border-radius: 15px;
          overflow: hidden;
        }

        .card-normal {
          background: transparent;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 0;
          color: white;
          z-index: 2;
          position: relative;
          overflow: hidden;
          clip-path: inset(0 0 0 var(--clip-right, 0%));
        }

        .card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 15px;
          transition: all 0.3s ease;
          filter: brightness(1.1) contrast(1.1);
          box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.1);
        }

        .card-image:hover {
          filter: brightness(1.2) contrast(1.2);
        }

        .card-ascii {
          background: transparent;
          z-index: 1;
          position: absolute;
          top: 0;
          left: 0;
          width: 400px;
          height: 250px;
          border-radius: 15px;
          overflow: hidden;
          clip-path: inset(0 calc(100% - var(--clip-left, 0%)) 0 0);
        }

        .ascii-content {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          color: rgba(220, 210, 255, 0.6);
          font-family: "Courier New", monospace;
          font-size: 11px;
          line-height: 13px;
          overflow: hidden;
          white-space: pre;
          animation: glitch 0.1s infinite linear alternate-reverse;
          margin: 0;
          padding: 0;
          text-align: left;
          vertical-align: top;
          box-sizing: border-box;
          -webkit-mask-image: linear-gradient(
            to right,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0.8) 30%,
            rgba(0, 0, 0, 0.6) 50%,
            rgba(0, 0, 0, 0.4) 80%,
            rgba(0, 0, 0, 0.2) 100%
          );
          mask-image: linear-gradient(
            to right,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0.8) 30%,
            rgba(0, 0, 0, 0.6) 50%,
            rgba(0, 0, 0, 0.4) 80%,
            rgba(0, 0, 0, 0.2) 100%
          );
        }

        @keyframes glitch {
          0% { opacity: 1; }
          15% { opacity: 0.9; }
          16% { opacity: 1; }
          49% { opacity: 0.8; }
          50% { opacity: 1; }
          99% { opacity: 0.9; }
          100% { opacity: 1; }
        }

        .scan-effect {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(0, 255, 255, 0.4),
            transparent
          );
          animation: scanEffect 0.6s ease-out;
          pointer-events: none;
          z-index: 5;
        }

        @keyframes scanEffect {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .card-line.dragging {
          cursor: grabbing;
        }

        .card-line:active {
          cursor: grabbing;
        }
      `}} />
    </div>
  );
};

export default CardBeamAnimation;