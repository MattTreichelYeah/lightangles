// ----------------------------------------------------------------------------------------------------------------------
// Create the canvas'
// ----------------------------------------------------------------------------------------------------------------------

function createCanvas() {
	const canvas = document.createElement("canvas");
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	return canvas;
}

function getContext(canvas) {
	const ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = false;
	return ctx;
}

const menuCanvas = createCanvas();
const menuCtx = getContext(menuCanvas);
const cycleCanvas = createCanvas();
const cycleCtx = getContext(cycleCanvas);
const lineCanvas = createCanvas();
const lineCtx = getContext(lineCanvas);

const body = document.body;
body.appendChild(lineCanvas);
body.appendChild(cycleCanvas);
body.appendChild(menuCanvas);

// ----------------------------------------------------------------------------------------------------------------------
//  Global Settings
// ----------------------------------------------------------------------------------------------------------------------

const ENTERKEY = 13;
const ESCAPEKEY = 27;
const OKEY = 79;
const FONT = "Oswald-Regular";

const MAXPLAYERCOUNT = 8;

const CYCLESPEED = 4;
const TRAILWIDTH = 4;

function Theme(name, colour, background, text, textHighlight) {
	this.NAME = name;
	this.COLOUR = colour;
	this.BACKGROUND = background;
	this.TEXT = text;
	this.TEXTHIGHLIGHT = textHighlight;
	this.TEXTALT = "#777777";
}
const BLACKTHEME = new Theme("Black", "#000000", "url('img/bgTileBlack.png')", "#FFFFFF", "#FF0000");
const WHITETHEME = new Theme("White", "#FFFFFF", "url('img/bgTileWhite.png')", "#000000", "#FF0000");
const THEMES = [BLACKTHEME, WHITETHEME];

// External
const OPTIONS = { 
	PLAYERCOUNT: MAXPLAYERCOUNT,
	WINS: MAXPLAYERCOUNT,
	THEME: THEMES[0],
	BOOST: false,
	DISAPPEARINGTRAILS: false
}

const CYCLELENGTH = 20;
const CYCLEWIDTH = 10;
const WIDTHMARGIN = Math.abs(CYCLELENGTH - CYCLEWIDTH)/2;

// Actual cycle and trail are hard-coded images, this ultimately applies to just score & winning text
const CYCLECOLOURS = ["rgba(255,0,0,255)", //red
				"rgba(0,0,255,255)", //blue
				"rgba(255,223,0,255)", //yellow
				"rgba(0,255,0,255)", //green
				"rgba(255,165,0,255)", //orange
				"rgba(0,255,255,255)", //cyan
				"rgba(255,0,255,255)", //magenta
				"rgba(119,119,119,255)"]; //grey

const CYCLEKEYCONTROLS = [[87,65,83,68,69], //wasde
				[84,70,71,72,89], //tfghy
				[73,74,75,76,79], //ijklo
				[38,37,40,39,16], //arrows/shift
				[49,50,51,52,53], //12345
				[54,55,56,57,48], //67890
				[90,88,67,86,66], //zxcvb
				[78,77,188,190,191]] //nm,./

// Dynamic based on OPTIONS.PLAYERCOUNT
function setCycleStarts() {
	const VSTARTOFFSET = Math.round(cycleCanvas.height/10); //Integer Points on Canvas are more optimized
	const HSTARTOFFSET = Math.round(cycleCanvas.width/(OPTIONS.PLAYERCOUNT + 1)); //Integer Points on Canvas are more optimized
	const CYCLESTARTS = [];
	for(let i = 0; i < OPTIONS.PLAYERCOUNT; i += 1) {
		let y = ((i % 2 === 0) ? VSTARTOFFSET : cycleCanvas.height - VSTARTOFFSET - CYCLELENGTH);
		let x = HSTARTOFFSET * (i + 1);
		CYCLESTARTS.push([x, y]);
	}
	return CYCLESTARTS;
}

// Mutable to reset to zero?
let SCORES = [0,0,0,0,0,0,0,0];

let HIGHLIGHT = 0;
				
let PAUSE = false;
let RESTART = true;
let MESSAGE = false;
let BUTTONPRESS = false;

const MESSAGEREADY = ["Ready in...", "3", "2", "1"];
const MESSAGEWINNER = ["Round Winner!", "Ready in...", "3", "2", "1"];
const MESSAGECHAMPION = ["Champion!"]

// Fix JavaScript mod for negative numbers
function mod(n, m) {
	return ((n % m) + m) % m;
}

// ----------------------------------------------------------------------------------------------------------------------
// Enumerations
// ----------------------------------------------------------------------------------------------------------------------

const DIR = {
	UP: 0,
	LEFT: 1,
	DOWN: 2,
	RIGHT: 3
}
Object.freeze(DIR);

const ORI = {
	HORIZONTAL: 0,
	VERTICAL: 1
}
Object.freeze(ORI);

const STATE = {
	TITLE: 0,
	OPTION: 1,
	GAME: 2
}
Object.freeze(STATE);

// ----------------------------------------------------------------------------------------------------------------------
// Sounds
// ----------------------------------------------------------------------------------------------------------------------

var music = document.getElementById("music");
if (music) music.volume = 0.4;

const deathSound = new Audio("snd/soundDeath.wav");
deathSound.volume = 0.2;

// ----------------------------------------------------------------------------------------------------------------------
// Game Objects
// ----------------------------------------------------------------------------------------------------------------------

function Cycle(id, x, y, colour, controls, initialDirection) { 
	this.id = id; 
	this.x = x; //Top Left Corner?
	this.y = y; //Top Left Corner?
	this.colour = colour; 
	this.controls = controls;
	this.boost = 1; //Multiplier
	this.boostcharge = true; //Set to false to prevent spam
	this.speed = CYCLESPEED;
	this.direction = initialDirection;
	this.directionPrev = initialDirection;
	this.orientation = ((initialDirection === DIR.LEFT || initialDirection === DIR.RIGHT) ? ORI.HORIZONTAL : ORI.VERTICAL);
	this.alive = true;
	this.image = new Image();
	this.image.src = ((initialDirection === DIR.LEFT || initialDirection === DIR.RIGHT) ? "img/cycle" + id + "h.png" : "img/cycle" + id + "v.png");
	this.trail = new Image(); //Use pixel image for trail because lines have annoying anti-aliasing
	this.trail.src = "img/trail" + id + ".png"; 
	
	// Turns is used to trace path and erase on death
	this.turns = [[this.x+CYCLELENGTH/2, this.y+CYCLELENGTH/2]]; //Start Point

	this.setHitbox = function (direction, orientation) { //Hitbox at mid-front interior, width/length = TRAILWIDTH/CYCLESPEED
		this.hitboxX, this.hitboxY;
		this.hitboxLength = CYCLELENGTH/2;
		this.hitboxWidth = TRAILWIDTH;
		if (direction === DIR.RIGHT) {
			this.hitboxX = this.x + CYCLELENGTH/2; 
			this.hitboxY = this.y + CYCLELENGTH/2 - TRAILWIDTH/2;
		} else if (direction === DIR.LEFT) {
			this.hitboxX = this.x; 
			this.hitboxY = this.y + CYCLELENGTH/2 - TRAILWIDTH/2;
		} else if (direction === DIR.UP) {
			this.hitboxX = this.x + CYCLELENGTH/2 - TRAILWIDTH/2; 
			this.hitboxY = this.y;
		} else if (direction === DIR.DOWN) {
			this.hitboxX = this.x + CYCLELENGTH/2 - TRAILWIDTH/2; 
			this.hitboxY = this.y + CYCLELENGTH - CYCLELENGTH/2;
		}


	}
}

const drawHitbox = function(cycle) {
	cycleCtx.fillStyle = (cycle.boostcharge ? OPTIONS.THEME.TEXT : OPTIONS.THEME.COLOUR);
	if (cycle.orientation === ORI.HORIZONTAL) cycleCtx.fillRect(cycle.hitboxX, cycle.hitboxY, cycle.hitboxLength, cycle.hitboxWidth);
	else if (cycle.orientation === ORI.VERTICAL) cycleCtx.fillRect(cycle.hitboxX, cycle.hitboxY, cycle.hitboxWidth, cycle.hitboxLength);
}

const cycles = [];

const initializeCycles = function() {
	cycles.length = 0; // Empties array
	const CYCLESTARTS = setCycleStarts();
	for(let i = 0; i < OPTIONS.PLAYERCOUNT; i += 1) {
		let initialDirection = ((i % 2 === 0) ? DIR.DOWN : DIR.UP); //Choice to alternate Left/Right, could change
		cycles.push(new Cycle(i, CYCLESTARTS[i][0], CYCLESTARTS[i][1], CYCLECOLOURS[i], CYCLEKEYCONTROLS[i], initialDirection));
		cycles[i].setHitbox(initialDirection, ORI.VERTICAL);
	}
};
	
// ----------------------------------------------------------------------------------------------------------------------
// Handle Controls
// ----------------------------------------------------------------------------------------------------------------------

const keysDown = {};

addEventListener("keydown", function (e) {
	keysDown[e.keyCode] = true;
}, false);
addEventListener("keyup", function (e) {
	delete keysDown[e.keyCode];
}, false);

const getGamepad = function (id) {
	const gamepad = navigator.getGamepads()[id];
	const gamepadControls = {
		Up: false,
		Left: false,
		Down: false,
		Right: false,
		Start: false,
		Back: false,
		A: false,
		B: false
	};
	if (gamepad !== undefined) {
		// 0.3 being makeshift deadzone
		gamepadControls.Up = gamepad.buttons[12].pressed || gamepad.axes[1] < -0.3;
		gamepadControls.Left = gamepad.buttons[14].pressed || gamepad.axes[0] < -0.3;
		gamepadControls.Down = gamepad.buttons[13].pressed || gamepad.axes[1] > 0.3;
		gamepadControls.Right = gamepad.buttons[15].pressed || gamepad.axes[0] > 0.3;
		gamepadControls.Start = gamepad.buttons[9].pressed;
		gamepadControls.Back = gamepad.buttons[8].pressed;
		gamepadControls.A = gamepad.buttons[0].pressed;
		gamepadControls.B = gamepad.buttons[1].pressed;
	}
	return gamepadControls;
};

// ----------------------------------------------------------------------------------------------------------------------
//  Movement & Collision
// ----------------------------------------------------------------------------------------------------------------------

const activateBoost = function(cycle) {
	if (OPTIONS.BOOST && cycle.boostcharge) {
		cycle.boost = 2;
		cycle.boostcharge = false;
		setTimeout(function() {
			cycle.boost = 1;
		}, 500);
		setTimeout(function() {
			cycle.boostcharge = true;
		}, 3000);
	}
}

const movement = function(cycle) {

	// Erase Previous Drawing
	switch (cycle.orientation) {
		case ORI.VERTICAL:
			cycleCtx.clearRect(cycle.x + WIDTHMARGIN, cycle.y, CYCLEWIDTH, CYCLELENGTH);
			break;
		case ORI.HORIZONTAL:
			cycleCtx.clearRect(cycle.x, cycle.y + WIDTHMARGIN, CYCLELENGTH, CYCLEWIDTH);
			break;
	}
	
	// Get relevant controls
	const cycleControls = cycle.controls;
	const gamepadControls = getGamepad(cycle.id);
	
	// Set cycle properties due to controls
	// Cycles can't turn backwards
	if (cycleControls[DIR.UP] in keysDown || gamepadControls.Up === true) {
		if (cycle.direction !== DIR.DOWN) { 
			cycle.direction = DIR.UP;
			cycle.orientation = ORI.VERTICAL;
			cycle.image.src = "img/cycle" + cycle.id + "v.png";
		}
	} else if (cycleControls[DIR.LEFT] in keysDown || gamepadControls.Left === true) {
		if (cycle.direction !== DIR.RIGHT) {
			cycle.direction = DIR.LEFT;
			cycle.orientation = ORI.HORIZONTAL;
			cycle.image.src = "img/cycle" + cycle.id + "h.png";
		}
	} else if (cycleControls[DIR.DOWN] in keysDown || gamepadControls.Down === true) {
		if (cycle.direction !== DIR.UP) { 
			cycle.direction = DIR.DOWN;
			cycle.orientation = ORI.VERTICAL;
			cycle.image.src = "img/cycle" + cycle.id + "v.png";
		}
	} else if (cycleControls[DIR.RIGHT] in keysDown || gamepadControls.Right === true) {
		if (cycle.direction !== DIR.LEFT) {	
			cycle.direction = DIR.RIGHT;
			cycle.orientation = ORI.HORIZONTAL;
			cycle.image.src = "img/cycle" + cycle.id + "h.png";
		}
	}

	// Last key in controls is boost
	if (cycleControls[cycleControls.length - 1] in keysDown || gamepadControls.A === true) {
		activateBoost(cycle);
	}
	
	// Set Hitbox?
	cycle.setHitbox(cycle.direction, cycle.orientation);
	
	// Track turns of cycle for erasing on death
	if (cycle.directionPrev !== cycle.direction) {
		cycle.turns.push([cycle.x + CYCLELENGTH/2, cycle.y + CYCLELENGTH/2]);
		cycle.directionPrev = cycle.direction;
	}

	// Draw newest frame
	switch (cycle.direction) {
		case DIR.UP:
			cycle.x = cycle.x;
			cycle.y = cycle.y - cycle.speed * cycle.boost;
			lineCtx.drawImage(
				cycle.trail, //image
				cycle.x + CYCLELENGTH/2 - TRAILWIDTH/2, //x
				cycle.y + CYCLELENGTH/2, //y
				TRAILWIDTH, //length
				cycle.speed * cycle.boost); //width
			break;
		case DIR.LEFT:
			cycle.x = cycle.x - cycle.speed * cycle.boost;
			cycle.y = cycle.y;
			lineCtx.drawImage(
				cycle.trail,
				cycle.x + CYCLELENGTH/2,
				cycle.y + CYCLELENGTH/2 - TRAILWIDTH/2,
				cycle.speed * cycle.boost,
				TRAILWIDTH);
			break;
		case DIR.DOWN:
			cycle.x = cycle.x;
			cycle.y = cycle.y + cycle.speed * cycle.boost;
			lineCtx.drawImage(
				cycle.trail,
				cycle.x + CYCLELENGTH/2 - TRAILWIDTH/2,
				cycle.y + CYCLELENGTH/2 - cycle.speed * cycle.boost,
				TRAILWIDTH,
				cycle.speed * cycle.boost);
			break;
		case DIR.RIGHT:
			cycle.x = cycle.x + cycle.speed * cycle.boost;
			cycle.y = cycle.y;
			lineCtx.drawImage(
				cycle.trail,
				cycle.x + CYCLELENGTH/2 - cycle.speed * cycle.boost,
				cycle.y + CYCLELENGTH/2 - TRAILWIDTH/2,
				cycle.speed * cycle.boost,
				TRAILWIDTH);
			break;
		default:
			cycle.x = cycle.x;
			cycle.y = cycle.y;
	}
};

const collisionCheck = function(cycle) {
	// Image Data is RGBαRGBαRGBα... of each pixel in selection
	// Hitbox is (trailwidth * cyclespeed) at the very front (protruding or intruding?) of the cycle
	// Note that getImageData() & files written to cycleCanvas create a security issue, so game must be run on a server or annoying options set to allow images
	// Careful that Cyclespeed isn't faster than Hitbox size
	
	// Check Boundary Collision
	let hitbox;
	switch (cycle.orientation) {
		case ORI.VERTICAL:
			if(cycle.x < 0 || cycle.y < 0 || cycle.x + WIDTHMARGIN + CYCLEWIDTH > cycleCanvas.width || cycle.y + CYCLELENGTH > cycleCanvas.height) {
				killCycle(cycle);
			}
			if (cycle.direction === DIR.DOWN) {
				hitbox = lineCtx.getImageData(cycle.x + CYCLELENGTH/2 - TRAILWIDTH/2, cycle.y + CYCLELENGTH, TRAILWIDTH, cycle.speed * cycle.boost).data;
			} else {
				hitbox = lineCtx.getImageData(cycle.x + CYCLELENGTH/2 - TRAILWIDTH/2, cycle.y - 1, TRAILWIDTH, cycle.speed * cycle.boost).data;
			}
			break;
		case ORI.HORIZONTAL:
			if(cycle.x < 0 || cycle.y < 0 || cycle.x + CYCLELENGTH > cycleCanvas.width || cycle.y + WIDTHMARGIN + CYCLEWIDTH > cycleCanvas.height) {
				killCycle(cycle);
			}
			if (cycle.direction === DIR.RIGHT) {
				hitbox = lineCtx.getImageData(cycle.x + CYCLELENGTH, cycle.y + CYCLELENGTH/2 - TRAILWIDTH/2, cycle.speed * cycle.boost, TRAILWIDTH).data;
			} else {
				hitbox = lineCtx.getImageData(cycle.x - 1, cycle.y + CYCLELENGTH/2 - TRAILWIDTH/2, cycle.speed * cycle.boost, TRAILWIDTH).data;
			}
			break;
	}
	
	// Check Cycle Collision First
	cycles.forEach(function(othercycle) {
		if (othercycle.id !== cycle.id) {
			if (othercycle.alive === true) {
				if (cycle.hitboxX <= (othercycle.hitboxX + othercycle.hitboxWidth) 
				&& othercycle.hitboxX <= (cycle.hitboxX + cycle.hitboxWidth) 
				&& cycle.hitboxY <= (othercycle.hitboxY + othercycle.hitboxLength) 
				&& othercycle.hitboxY <= (cycle.hitboxY + cycle.hitboxLength)) {
					killCycle(cycle);
					killCycle(othercycle);
					return;
				}
			} 
		}
	});
	
	// Check Trail Collision
	for (let i = 0; i < hitbox.length; i += 4) {
		pixelcolour = "rgba(" + hitbox[i] + "," + hitbox[i+1] + "," + hitbox[i+2] + "," + hitbox[i+3] + ")";
		if (pixelcolour !== "rgba(0,0,0,0)") { // rgba(0,0,0,0) is transparent black, ie. default background
			killCycle(cycle);
			return;
		}
	}
};

const checkWinner = function() {
	let livingCycles = [];
	cycles.forEach(function(cycle) {
		if (cycle.alive === true) {
			livingCycles.push(cycle);
		}
	});
	if (livingCycles.length === 1) {
		const cycle = livingCycles.pop();
		SCORES[cycle.id] += 1;
		if (SCORES[cycle.id] === OPTIONS.WINS) {
			showMessage("Champion! Restarting...", cycle.colour, 3000);
			SCORES = SCORES.map(function(value) { return value = 0; });
		} else {
			showTimer3Message("Winner! Ready in 3...", cycle.colour);
		}
		RESTART = true;
		return;
	} else if (livingCycles.length === 0) {
		showMessage("Draw", OPTIONS.THEME.TEXT, 3000);
		RESTART = true;
		return;
	}
}

const killCycle = function(cycle) {
	deathSound.currentTime = 0;
	deathSound.play();
	cycle.alive = false;
	cycle.turns.push([cycle.x+CYCLELENGTH/2,cycle.y+CYCLELENGTH/2]);  // End Point
	erasePlayer(cycle);
};

const erasePlayer = function(cycle) {
	// Traces turns and erases just player's lines
	const turns = cycle.turns;
	for (let i = 1; i < turns.length; i += 1) {
		if (turns[i-1][0] !== turns[i][0]) { //Horizontal Trail
			lineCtx.clearRect(Math.min(turns[i-1][0], turns[i][0]), turns[i][1] - TRAILWIDTH/2, Math.abs(turns[i-1][0] - turns[i][0]), TRAILWIDTH); //Erase Old Pixels
		} else { //Vertical Trail
			lineCtx.clearRect(turns[i][0] - TRAILWIDTH/2, Math.min(turns[i-1][1], turns[i][1]), TRAILWIDTH, Math.abs(turns[i-1][1] - turns[i][1])); //Erase Old Pixels
		}
	}
};

// ----------------------------------------------------------------------------------------------------------------------
// Rendering
// ----------------------------------------------------------------------------------------------------------------------

// Update game objects
const update = function () {

	cycles.forEach(function(cycle) {
		if (cycle.alive === true) {
			movement(cycle);
		}
	});
	
	// Must do Collision Check after all Movement
	cycles.forEach(function(cycle) {
		if (cycle.alive === true) {
			collisionCheck(cycle);
		}
	});

	checkWinner();
};

// Draw everything
let render = function () {
	
	cycles.forEach(function(cycle) {
		if (cycle.alive === true) { 
			cycleCtx.drawImage(cycle.image, cycle.x, cycle.y);
			drawHitbox(cycle);
		}
	});
	
	menuCtx.clearRect(0, 0, 50, menuCanvas.height); //Hard Coded Erase, Getting Desperate
	menuCtx.font = "24px " + FONT;
	
	menuCtx.textAlign = "left";
	menuCtx.textBaseline = "top";
	cycles.forEach(function(cycle) {
		menuCtx.fillStyle = cycle.colour;
		menuCtx.fillText(SCORES[cycle.id], 10, 10 + 30 * cycle.id);
	});
};

// ----------------------------------------------------------------------------------------------------------------------
//  Message/Pause Overlays
// ----------------------------------------------------------------------------------------------------------------------

const showMessage = function (message, colour, time) {
	MESSAGE = true;

	// Draw Message Box
	menuCtx.strokeStyle = colour;
	menuCtx.fillStyle = OPTIONS.THEME.COLOUR;
	menuCtx.lineWidth = TRAILWIDTH * 2;
	menuCtx.beginPath();
	menuCtx.arc(menuCanvas.width/2, menuCanvas.height/2, 120, 0, 2 * Math.PI);
	menuCtx.fill();
	menuCtx.stroke();
	
	// Write Message
	menuCtx.font = "24px " + FONT;
	menuCtx.textAlign = "center";
	menuCtx.textBaseline = "middle";
	menuCtx.fillStyle = OPTIONS.THEME.TEXT;
	menuCtx.fillText(message, menuCanvas.width/2, menuCanvas.height/2);

	// Delete Message after given time
	setTimeout(function() {
		MESSAGE = false;
		menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);		
	}, time);
};

const showTimer3Message = function (initialMessage, colour) {
	MESSAGE = true;

	// Draw Message Box
	menuCtx.strokeStyle = colour;
	menuCtx.fillStyle = OPTIONS.THEME.COLOUR;
	menuCtx.lineWidth = TRAILWIDTH * 5;
	menuCtx.beginPath();
	menuCtx.arc(menuCanvas.width/2, menuCanvas.height/2, 120, 0, 2 * Math.PI);
	menuCtx.fill();
	menuCtx.stroke();

	let timer = 3;
	timeoutFunction = function() {
		// Clear old text
		menuCtx.fillStyle = OPTIONS.THEME.COLOUR;
		menuCtx.fill();
		// Write Message
		menuCtx.textAlign = "center";
		menuCtx.textBaseline = "middle";
		menuCtx.fillStyle = OPTIONS.THEME.TEXT;
		if (timer === 3) {
			menuCtx.fillText(initialMessage, menuCanvas.width/2, menuCanvas.height/2);
		} else if (timer === 2) {
			menuCtx.font = "85px " + FONT;
			menuCtx.fillText("2", menuCanvas.width/2, menuCanvas.height/2);
		} else if (timer === 1) {
			menuCtx.font = "140px " + FONT;
			menuCtx.fillText("1", menuCanvas.width/2, menuCanvas.height/2);
		} else if (timer === 0) {
			MESSAGE = false;
			clearInterval(timeout);
			menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
		}
		timer -= 1;
	}
	timeoutFunction();
	const timeout = setInterval(timeoutFunction, 1000);
};

const pause = function () {
	const pauseOverlay = new Image(); //Need onload Event Listener
	pauseOverlay.src = "img/pauseOverlay.png";
	pauseOverlay.addEventListener("load", function() {
		// Draw transparent overlay
		menuCtx.globalAlpha = 0.7;
		menuCtx.drawImage(pauseOverlay, 0, 0, menuCanvas.width, menuCanvas.height);
		
		// Write Message
		menuCtx.globalAlpha = 1;
		menuCtx.fillStyle = "#FFFFFF";
		menuCtx.font = "24px " + FONT;
		menuCtx.textAlign = "center";
		menuCtx.textBaseline = "middle";
		menuCtx.fillText("Press Back or [O] to return to Options", menuCanvas.width/2, menuCanvas.height/2);
	}, false);
};

const unpause = function () {
	menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
};

// ----------------------------------------------------------------------------------------------------------------------
//  Game States
// ----------------------------------------------------------------------------------------------------------------------

const doTitleState = function (gamestate) {
	//Show Logo
	const titleImage = new Image();
	titleImage.src = "img/logo2.png";
	titleImage.addEventListener("load", function() {
		// Centered
		menuCtx.drawImage(titleImage, menuCanvas.width/2 - titleImage.width/2, menuCanvas.height/2 - titleImage.height/2);
	}, false);
	
	const gamepadControls = getGamepad(0);

	if (!BUTTONPRESS) {
		if (ENTERKEY in keysDown || gamepadControls.A === true || gamepadControls.Start === true) {
			// Clear Logo on Start and move to Options
			// BUTTONPRESS will be deactivated by Options to prevent pass-through
			BUTTONPRESS = true;
			menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
			gamestate = STATE.OPTION;
		}
	}
	return(gamestate);
};

const doOptionState = function (gamestate) {
	// Will keep redrawing every frame so need to clear
	menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
	// Option Text Settings
	menuCtx.font = "24px " + FONT;
	menuCtx.textAlign = "center";
	menuCtx.textBaseline = "top";

	// Write Option Text
	menuCtx.fillStyle = OPTIONS.THEME.TEXTALT;
	menuCtx.fillText("Press A or [Enter] to Start", menuCanvas.width/2, menuCanvas.height/2 - 30 * 3.5);
	menuCtx.fillStyle = OPTIONS.THEME.TEXT;
	const optionmessages = ["Players: " + OPTIONS.PLAYERCOUNT,
				"Wins: " + OPTIONS.WINS,
				"Theme: " + OPTIONS.THEME.NAME,
				"Boost: " + (OPTIONS.BOOST ? "Yes" : "No"),
				"Disappearing Trails: " + (OPTIONS.DISAPPEARINGTRAILS ? "Yes" : "No")];
	for(let i = 0; i < optionmessages.length; i += 1) {
		// Highlight value is updated by controls
		menuCtx.fillStyle = (i === HIGHLIGHT ? OPTIONS.THEME.TEXTHIGHLIGHT : OPTIONS.THEME.TEXT);
		menuCtx.fillText(optionmessages[i], menuCanvas.width/2, menuCanvas.height/2 - 30 * (optionmessages.length/2 - i));
	}
	
	// Handle Option Controls
	const gamepadControls = getGamepad(0);
	if (!BUTTONPRESS) {
		BUTTONPRESS = true;
		// Enter/A/Start --> Start the Game
		if (ENTERKEY in keysDown || gamepadControls.A === true || gamepadControls.Start === true) {
			menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
			gamestate = STATE.GAME;
		// Up --> Move Highlight
		} else if (CYCLEKEYCONTROLS[0][0] in keysDown || gamepadControls.Up === true) {
			HIGHLIGHT = mod((HIGHLIGHT - 1), Object.keys(OPTIONS).length);
		// Down --> Move Highlight
		} else if (CYCLEKEYCONTROLS[0][2] in keysDown || gamepadControls.Down === true) { 
			HIGHLIGHT = mod((HIGHLIGHT + 1), Object.keys(OPTIONS).length);
		// Left/Right --> Change Option
		} else if ((CYCLEKEYCONTROLS[0][1] in keysDown || gamepadControls.Left === true) 
				|| (CYCLEKEYCONTROLS[0][3] in keysDown || gamepadControls.Right === true)) {

			const left = CYCLEKEYCONTROLS[0][1] in keysDown || gamepadControls.Left === true;
			const optionValue = Object.keys(OPTIONS)[HIGHLIGHT];
			const optionType = typeof OPTIONS[optionValue];
			switch (optionType) {
				case "number": 
					// This is a dumb implementation because Win Count is limited by Player Count
					OPTIONS[optionValue] = (left === true ? OPTIONS[optionValue] - 1 : OPTIONS[optionValue] + 1);
					if (OPTIONS[optionValue] > MAXPLAYERCOUNT) OPTIONS[optionValue] = MAXPLAYERCOUNT;
					else if (OPTIONS[optionValue] < 2) OPTIONS[optionValue] = 2;
					break;
				case "boolean": 
					OPTIONS[optionValue] = !OPTIONS[optionValue]; 
					break;
				case "object": 
					if (OPTIONS[optionValue] instanceof Theme) {
						OPTIONS[optionValue] = THEMES[mod(THEMES.indexOf(OPTIONS.THEME) + 1, THEMES.length)];
						document.body.style.background = OPTIONS.THEME.BACKGROUND;
					}
					break;
			}
		} else {
			BUTTONPRESS = false;
		}
	} else if (Object.keys(keysDown).length === 0) { 
		BUTTONPRESS = false;
	}
	return(gamestate);
};

const doGameState = function (gamestate) {
	const gamepadControls = getGamepad(0);

	if (!BUTTONPRESS && !MESSAGE) {
		BUTTONPRESS = true;
		// Pause the Game
		if (ENTERKEY in keysDown || ESCAPEKEY in keysDown || gamepadControls.Start === true) {
			PAUSE = !PAUSE;
			if (PAUSE === true) pause(); else unpause();
		// Go back to the Option Screen from Pause
		} else if (PAUSE == true && (OKEY in keysDown || gamepadControls.Back === true)) {
			unpause();
			PAUSE = false;
			RESTART = true;
			SCORES = SCORES.map(function(value) { return value = 0; });
			gamestate = STATE.OPTION;
			return(gamestate);
		} else {
			BUTTONPRESS = false;
		}
	
		// ie. Normal Gameplay
		if(!PAUSE) {
			// Reset Cycles if new Round
			if (RESTART) {
				// Show Start Message if necessary
				if (SCORES.every(function(value) { return value === 0; })) showTimer3Message("Get Ready in 3...", OPTIONS.THEME.TEXT);
				lineCtx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
				cycleCtx.clearRect(0, 0, cycleCanvas.width, cycleCanvas.height);
				initializeCycles();
				RESTART = false;
			}
			update();
			render();
		}
	} else if (Object.keys(keysDown).length === 0) { 
		BUTTONPRESS = false;
	}
	return(gamestate);
};

// ----------------------------------------------------------------------------------------------------------------------
//  Main
// ----------------------------------------------------------------------------------------------------------------------

const main = function (gamestate) {
	
	switch (gamestate) {
		case STATE.TITLE: 
			gamestate = doTitleState(gamestate);
			break;
		case STATE.OPTION: 
			gamestate = doOptionState(gamestate);
			break;
		case STATE.GAME: 
			gamestate = doGameState(gamestate);
			break;
	}

	requestAnimationFrame(function() { main(gamestate) });
};

main(STATE.TITLE);