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

let DISAPPEARTIMEOUT;
let DISAPPEAR = false;
const DISAPPEARTIME = 5000;

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

// LET THERE BE MUTABLE GLOBAL VARIABLES

// Mutable to reset to zero?
let SCORES = [0,0,0,0,0,0,0,0];

let HIGHLIGHT = 0;
				
let PAUSE = false;
let RESTART = true;
let MESSAGE = false;
let INPUTMESSAGE = false;
let INPUTTER = 0;
let READY = false;
let BUTTONPRESS = false;

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

let menuMusic = document.getElementById("menuMusic");
let gameMusic = document.getElementById("gameMusic");
menuMusic.volume = 1;

const deathSound = new Audio("snd/explosion2.mp3");
const optionSound = new Audio("snd/option.wav");
const option2Sound = new Audio("snd/option2.wav");
const countSound = new Audio("snd/countdown.wav");
const selectSound = new Audio("snd/select.wav");
const boostSound = new Audio("snd/boost.wav");
const winnerSound = new Audio("snd/winner.wav");
const drawSound = new Audio("snd/draw.wav");
const championSound = new Audio("snd/champion.wav");
deathSound.volume = 0.2;
optionSound.volume = 0.6;
option2Sound.volume = 0.6;

function fadeAudio (audio, target) {
    const fade = setInterval(function () {
		try { //JavaScript fails at precision
        	audio.volume -= 0.1;
        	if (Math.abs(audio.volume - target) <= 0.1) clearInterval(fade);
        } catch (err) {
        	audio.volume = 0;
        	audio.pause();
			audio.currentTime = 0;
            clearInterval(fade);
        }
    }, 100);
}
function startAudio (audio, target) {
	audio.play();
    const start = setInterval(function () {
		try { //JavaScript fails at precision
        	audio.volume += 0.1;
        } catch (err) {
        	audio.volume = 1;
            clearInterval(start);
        }
    }, 10);
}

// ----------------------------------------------------------------------------------------------------------------------
// Game Objects
// ----------------------------------------------------------------------------------------------------------------------

function Cycle(id, x, y, colour, controls, initialDirection) { 
	this.id = id; 
	this.x = x; //Top Left Corner, including widthmargin
	this.y = y; //Top Left Corner, including widthmargin
	this.colour = colour; 
	this.controls = controls;
	this.boost = 1; //Multiplier
	this.boostcharge = true; //Set to false to prevent spam
	this.speed = CYCLESPEED;
	this.direction = initialDirection;
	this.directionPrev = initialDirection;
	this.orientation = ((initialDirection === DIR.LEFT || initialDirection === DIR.RIGHT) ? ORI.HORIZONTAL : ORI.VERTICAL);
	this.alive = true;
	// Pixel Images used because anti-aliasing applied to drawn canvas rectangles
	this.image = ((initialDirection === DIR.LEFT || initialDirection === DIR.RIGHT) ? loader.images["cycle" + id + "h"] : loader.images["cycle" + id + "v"]);
	this.trail = loader.images["trail" + id];
	
	// Turns is used to trace path and erase on death
	this.turns = [[this.x + CYCLELENGTH/2, this.y + CYCLELENGTH/2]]; //Start Point

 	//Hitbox always at mid-front interior, just size of cyclespeed/trailwidth, visible with Boost setting
 	//Hitbox x and y are always top left corner, length and width stay constant but drawing uses them based on orientation
	this.setHitbox = function (direction) {
		this.hitboxX, this.hitboxY; //Top Left Corner
		this.hitboxLength = CYCLESPEED;
		this.hitboxWidth = TRAILWIDTH;
		if (direction === DIR.RIGHT) {
			this.hitboxX = this.x + CYCLELENGTH/2; 
			this.hitboxY = this.y + CYCLELENGTH/2 - TRAILWIDTH/2;
		} else if (direction === DIR.LEFT) {
			this.hitboxX = this.x + CYCLELENGTH/2 - this.hitboxLength; 
			this.hitboxY = this.y + CYCLELENGTH/2 - TRAILWIDTH/2;
		} else if (direction === DIR.UP) {
			this.hitboxX = this.x + CYCLELENGTH/2 - TRAILWIDTH/2; 
			this.hitboxY = this.y + CYCLELENGTH/2 - this.hitboxLength;
		} else if (direction === DIR.DOWN) {
			this.hitboxX = this.x + CYCLELENGTH/2 - TRAILWIDTH/2; 
			this.hitboxY = this.y + CYCLELENGTH/2;
		}
	}
}

const drawHitbox = function(cycle) {
	// I am an awful person and am using the Hitbox as a boost display for no clear reason
	cycleCtx.fillStyle = (cycle.boostcharge ? "#FFFFFF" : cycle.colour);
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
		cycles[i].setHitbox(initialDirection);
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
		B: false,
		none: function() {
			for (let i in this) {
	        	if (this[i] === true) return false;
	    	}
	    	return true;
	    }
	};
	if (gamepad) {
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
		boostSound.currentTime = 0; boostSound.play();
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
			cycle.image = loader.images["cycle" + cycle.id + "v"]
		}
	} else if (cycleControls[DIR.LEFT] in keysDown || gamepadControls.Left === true) {
		if (cycle.direction !== DIR.RIGHT) {
			cycle.direction = DIR.LEFT;
			cycle.orientation = ORI.HORIZONTAL;
			cycle.image = loader.images["cycle" + cycle.id + "h"]
		}
	} else if (cycleControls[DIR.DOWN] in keysDown || gamepadControls.Down === true) {
		if (cycle.direction !== DIR.UP) { 
			cycle.direction = DIR.DOWN;
			cycle.orientation = ORI.VERTICAL;
			cycle.image = loader.images["cycle" + cycle.id + "v"]
		}
	} else if (cycleControls[DIR.RIGHT] in keysDown || gamepadControls.Right === true) {
		if (cycle.direction !== DIR.LEFT) {	
			cycle.direction = DIR.RIGHT;
			cycle.orientation = ORI.HORIZONTAL;
			cycle.image = loader.images["cycle" + cycle.id + "h"]
		}
	}

	// Last key in controls is boost
	if (cycleControls[cycleControls.length - 1] in keysDown || gamepadControls.A === true) {
		activateBoost(cycle);
	}
	
	// Track turns of cycle for erasing on death
	if (cycle.directionPrev !== cycle.direction) {
		cycle.turns.push([cycle.x + CYCLELENGTH/2, cycle.y + CYCLELENGTH/2]);
		cycle.directionPrev = cycle.direction;
		//console.log(cycle.turns);
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

	// Set Hitbox?
	cycle.setHitbox(cycle.direction);
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
			if (cycle.hitboxX < 0 || cycle.hitboxY < 0 || cycle.hitboxX + cycle.hitboxWidth > cycleCanvas.width || cycle.hitboxY + cycle.hitboxLength > cycleCanvas.height) {
				killCycle(cycle);
			}
			hitbox = lineCtx.getImageData(cycle.hitboxX, cycle.hitboxY, cycle.hitboxWidth, cycle.hitboxLength).data;
			break;
		case ORI.HORIZONTAL:
			if (cycle.hitboxX < 0 || cycle.hitboxY < 0 || cycle.hitboxX + cycle.hitboxLength > cycleCanvas.width || cycle.hitboxY + cycle.hitboxWidth > cycleCanvas.height) {
				killCycle(cycle);
			}
			hitbox = lineCtx.getImageData(cycle.hitboxX, cycle.hitboxY, cycle.hitboxLength, cycle.hitboxWidth).data;
			break;
	}
	
	// Check Cycle Collision First
	cycles.forEach(function(othercycle) {
		if (othercycle.id !== cycle.id) {
			if (othercycle.alive === true) {
				// Have to do some ugly config for hitbox depending on orientation
				let cycleWidth, cycleLength, otherWidth, otherLength;
				if (cycle.orientation === ORI.VERTICAL) {
					cycleWidth = cycle.hitboxX + cycle.hitboxWidth;
					cycleLength = cycle.hitboxY + cycle.hitboxLength;
				} else {
					cycleWidth = cycle.hitboxX + cycle.hitboxLength;
					cycleLength = cycle.hitboxY + cycle.hitboxWidth;
				}
				if (cycle.orientation === ORI.VERTICAL) {
					otherWidth = othercycle.hitboxX + othercycle.hitboxWidth;
					otherLength = othercycle.hitboxY + othercycle.hitboxLength;
				} else {
					otherWidth = othercycle.hitboxX + othercycle.hitboxLength;
					otherLength = othercycle.hitboxY + othercycle.hitboxWidth;
				}

				if (cycle.hitboxX <= otherWidth 
				&& othercycle.hitboxX <= cycleWidth 
				&& cycle.hitboxY <= otherLength
				&& othercycle.hitboxY <= cycleLength) {
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
			championSound.currentTime = 0; championSound.play();
			showInputMessage(MESSAGECHAMPION, cycle.id);
		} else {
			winnerSound.currentTime = 0; winnerSound.play();
			showInputMessage(MESSAGEWINNER, cycle.id);
		}
		RESTART = true;
		return;
	} else if (livingCycles.length === 0) {
		drawSound.currentTime = 0; drawSound.play();
		showInputMessage(MESSAGEDRAW, -1);
		RESTART = true;
		return;
	}
}

const killCycle = function(cycle) {
	deathSound.currentTime = 0; deathSound.play();
	gameMusic.playbackRate += 0.5 / MAXPLAYERCOUNT;
	cycle.alive = false;
	eraseCycle(cycle);
	cycle.turns.push([cycle.x + CYCLELENGTH/2, cycle.y + CYCLELENGTH/2]);  // End Point
	eraseTrail(cycle);
};

const eraseTrail = function(cycle) {
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

const eraseCycle = function(cycle) {
	let deathAnimation;
	if (cycle.orientation === ORI.VERTICAL) deathAnimation = loader.images["cycleDie" + cycle.id + "v"];
	else if (cycle.orientation === ORI.HORIZONTAL) deathAnimation = loader.images["cycleDie" + cycle.id + "h"];
	let i = 1;
	const drawDeath = setInterval(function() {
		// Erase Previous Drawing
		switch (cycle.orientation) {
			case ORI.VERTICAL:
				cycleCtx.clearRect(cycle.x + WIDTHMARGIN, cycle.y, CYCLEWIDTH, CYCLELENGTH);
				break;
			case ORI.HORIZONTAL:
				cycleCtx.clearRect(cycle.x, cycle.y + WIDTHMARGIN, CYCLELENGTH, CYCLEWIDTH);
				break;
		}
		cycleCtx.drawImage(deathAnimation, (i % 2) * CYCLELENGTH, (Math.floor(i/2) % 3) * CYCLELENGTH, CYCLELENGTH, CYCLELENGTH, cycle.x, cycle.y, CYCLELENGTH, CYCLELENGTH);
		i += 1;
		if (i === 6) clearInterval(drawDeath);
	}, 100);
}

const triggerDisappearTrail = function() {
	DISAPPEAR = false;
	clearTimeout(DISAPPEARTIMEOUT);
	DISAPPEARTIMEOUT = setTimeout(function() {
		DISAPPEAR = true;
	}, DISAPPEARTIME);
}

const disappearTrail = function(cycle) {
	const turns = cycle.turns;
	lineCtx.fillStyle = OPTIONS.THEME.TEXT;

	if (turns.length > 1) {
		lineCtx.fillStyle = "grey";
		if (turns[0][0] < turns[1][0]) { // Right
			lineCtx.clearRect(turns[0][0], turns[0][1] - TRAILWIDTH/2, cycle.speed * cycle.boost, TRAILWIDTH); //Erase Old Pixels
			cycle.turns[0][0] = turns[0][0] + cycle.speed * cycle.boost;
			if (turns[0][0] === turns[1][0] && turns[0][1] === turns[1][1]) {
				turns.shift();
				lineCtx.clearRect(turns[0][0], turns[0][1] - TRAILWIDTH/2, cycle.speed * cycle.boost, TRAILWIDTH); //Erase Old Pixels
			}
		} else if (turns[0][0] > turns[1][0]) { // Left
			lineCtx.clearRect(turns[0][0] - cycle.speed * cycle.boost, turns[0][1] - TRAILWIDTH/2, cycle.speed * cycle.boost, TRAILWIDTH); //Erase Old Pixels
			cycle.turns[0][0] = turns[0][0] - cycle.speed * cycle.boost;
			if (turns[0][0] === turns[1][0] && turns[0][1] === turns[1][1]) {
				turns.shift();
				lineCtx.clearRect(turns[0][0] - cycle.speed * cycle.boost, turns[0][1] - TRAILWIDTH/2, cycle.speed * cycle.boost, TRAILWIDTH); //Erase Old Pixels
			}
		// Something's weirdly backwards about these two compared to Left/Right and turns.length === 1
		} else if (turns[0][1] < turns[1][1]) { // Up
			cycle.turns[0][1] = turns[0][1] + cycle.speed * cycle.boost;
			lineCtx.clearRect(turns[0][0] - TRAILWIDTH/2, turns[0][1] - cycle.speed * cycle.boost, TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			if (turns[0][0] === turns[1][0] && turns[0][1] === turns[1][1]) {
				turns.shift();
				lineCtx.clearRect(turns[0][0] - TRAILWIDTH/2, turns[0][1] - cycle.speed * cycle.boost, TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			}
		} else if (turns[0][1] > turns[1][1]) { // Down
			cycle.turns[0][1] = turns[0][1] - cycle.speed * cycle.boost;
			lineCtx.clearRect(turns[0][0] - TRAILWIDTH/2, turns[0][1], TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			if (turns[0][0] === turns[1][0] && turns[0][1] === turns[1][1]) {
				turns.shift();
				lineCtx.clearRect(turns[0][0] - TRAILWIDTH/2, turns[0][1], TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			}
		}
	} else {
		if (cycle.direction === DIR.RIGHT) { // Right
			lineCtx.clearRect(turns[0][0], turns[0][1] - TRAILWIDTH/2, cycle.speed * cycle.boost, TRAILWIDTH); //Erase Old Pixels
			cycle.turns[0][0] = turns[0][0] + cycle.speed * cycle.boost;
		} else if (cycle.direction === DIR.LEFT) { // Left
			lineCtx.clearRect(turns[0][0] - cycle.speed * cycle.boost, turns[0][1] - TRAILWIDTH/2, cycle.speed * cycle.boost, TRAILWIDTH); //Erase Old Pixels
			cycle.turns[0][0] = turns[0][0] - cycle.speed * cycle.boost;
		} else if (cycle.direction === DIR.UP) { // Up
			lineCtx.clearRect(turns[0][0] - TRAILWIDTH/2, turns[0][1] - cycle.speed * cycle.boost, TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			cycle.turns[0][1] = turns[0][1] - cycle.speed * cycle.boost;
		} else if (cycle.direction === DIR.DOWN) { // Down
			lineCtx.clearRect(turns[0][0] - TRAILWIDTH/2, turns[0][1], TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			cycle.turns[0][1] = turns[0][1] + cycle.speed * cycle.boost;
		}
	}
}

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

	if (DISAPPEAR) {
		cycles.forEach(function(cycle) {
			if (cycle.alive === true) {
				disappearTrail(cycle);
			}
		});
	}

	checkWinner();
};

// Draw everything
let render = function () {
	
	cycles.forEach(function(cycle) {
		if (cycle.alive === true) { 
			cycleCtx.drawImage(cycle.image, cycle.x, cycle.y);
			if (OPTIONS.BOOST) drawHitbox(cycle);
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

const MESSAGEREADY = "Ready?";
const MESSAGECOUNTDOWN = ["3", "2", "1"];
const MESSAGEWINNER = "Round Winner!";
const MESSAGEDRAW = "Draw!";
const MESSAGECHAMPION = "Champ!"

const showInputMessage = function (message, id, ready) {
	INPUTMESSAGE = true;
	if (ready) {
		READY = true;
	}
	gameMusic.playbackRate = 1;

	// Draw Message Box
	if (id !== -1) {
		menuCtx.strokeStyle = cycles[id].colour;
		INPUTTER = id;
	} else {
		menuCtx.strokeStyle = OPTIONS.THEME.TEXT; 
		INPUTTER = 0;
	}
	menuCtx.fillStyle = OPTIONS.THEME.COLOUR;
	menuCtx.lineWidth = TRAILWIDTH * 2;
	menuCtx.fillRect(menuCanvas.width/2 - 120, menuCanvas.height/2 - 50, 240, 100);
	menuCtx.strokeRect(menuCanvas.width/2 - 120, menuCanvas.height/2 - 50, 240, 100);
	
	// Write Message
	menuCtx.font = "30px " + FONT;
	menuCtx.textAlign = "center";
	menuCtx.textBaseline = "middle";
	menuCtx.fillStyle = OPTIONS.THEME.TEXT;
	menuCtx.fillText(message, menuCanvas.width/2, menuCanvas.height/2);
}

const showTimeoutMessage = function (messages) {
	MESSAGE = true;
	
	let timer = 0;
	timeoutFunction = function() {
		// Clear old text
		menuCtx.clearRect(menuCanvas.width/2 - 130, menuCanvas.height/2 - 60, 260, 120);
		// Write Message
		menuCtx.textAlign = "center";
		menuCtx.textBaseline = "middle";
		menuCtx.fillStyle = OPTIONS.THEME.TEXT;
		
		if (timer !== messages.length) {
			countSound.currentTime = 0; countSound.play();
			menuCtx.font = 24 * (timer + 3) + "px " + FONT;
			menuCtx.fillText(messages[timer], menuCanvas.width/2, menuCanvas.height/2);
		} else {
			MESSAGE = false;
			startAudio(gameMusic);
			clearInterval(timeout);
			menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
			// Ugly: But always needs to trigger after timeout
			if (OPTIONS.DISAPPEARINGTRAILS) triggerDisappearTrail();
		}
		timer += 1;
	}
	timeoutFunction();
	const timeout = setInterval(timeoutFunction, 1000);
};

const pause = function () {
	const pauseOverlay = loader.images["pauseOverlay"];
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
};

const unpause = function () {
	menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
};

// ----------------------------------------------------------------------------------------------------------------------
//  Game States
// ----------------------------------------------------------------------------------------------------------------------

const doTitleState = function (gamestate) {
	//Show Logo
	const titleImage = loader.images["logo2"];
	menuCtx.drawImage(titleImage, menuCanvas.width/2 - titleImage.width/2, menuCanvas.height/2 - titleImage.height/2);
	
	const gamepadControls = getGamepad(0);

	if (!BUTTONPRESS) {
		if (ENTERKEY in keysDown || gamepadControls.A === true || gamepadControls.Start === true) {
			// Clear Logo on Start and move to Options
			// BUTTONPRESS will be deactivated by Options to prevent pass-through
			selectSound.currentTime = 0; selectSound.play();
			BUTTONPRESS = true;
			menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
			gamestate = STATE.OPTION;
		}
	}
	return(gamestate);
};

const doOptionState = function (gamestate) {
	if (gameMusic.volume === 1) fadeAudio(gameMusic);
	if (menuMusic.volume === 0) startAudio(menuMusic);
	if (menuMusic.currentTime >= 208) {
		// Unavoidable delay, but difficult to notice
		menuMusic.currentTime = 7.25;
	}

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
			selectSound.currentTime = 0; selectSound.play();
		// Up --> Move Highlight
		} else if (CYCLEKEYCONTROLS[0][0] in keysDown || gamepadControls.Up === true) {
			console.log(navigator.getGamepads());
			HIGHLIGHT = mod((HIGHLIGHT - 1), Object.keys(OPTIONS).length);
			optionSound.currentTime = 0; optionSound.play();
		// Down --> Move Highlight
		} else if (CYCLEKEYCONTROLS[0][2] in keysDown || gamepadControls.Down === true) { 
			console.log(navigator.getGamepads());
			HIGHLIGHT = mod((HIGHLIGHT + 1), Object.keys(OPTIONS).length);
			optionSound.currentTime = 0; optionSound.play();
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
					// Awful and lazy way to make Boost & Disappearing Trails mutually exclusive (for now)
					if (OPTIONS[optionValue] && optionValue === "BOOST") OPTIONS["DISAPPEARINGTRAILS"] = false;
					else if (OPTIONS[optionValue] && optionValue === "DISAPPEARINGTRAILS") OPTIONS["BOOST"] = false;  
					break;
				case "object": 
					if (OPTIONS[optionValue] instanceof Theme) {
						OPTIONS[optionValue] = THEMES[mod(THEMES.indexOf(OPTIONS.THEME) + 1, THEMES.length)];
						document.body.style.background = OPTIONS.THEME.BACKGROUND;
					}
					break;
			}
			option2Sound.currentTime = 0; option2Sound.play();
		// Special Option: Reload Game with Controller
		} else if (gamepadControls.B === true) {
			window.location.reload();
		} else {
			BUTTONPRESS = false;
		}
	} else if (Object.keys(keysDown).length === 0 && gamepadControls.none()) { 
		BUTTONPRESS = false;
	}
	return(gamestate);
};

const doGameState = function (gamestate) {
	if (menuMusic.volume === 1) fadeAudio(menuMusic);
	if (gameMusic.currentTime >= 161) {
		// Unavoidable delay, but difficult to notice
		gameMusic.currentTime = 7.3;
	}

	const gamepadControls = getGamepad(0);

	if (!BUTTONPRESS && !MESSAGE && !INPUTMESSAGE) {
		BUTTONPRESS = true;
		// Pause the Game
		if (ENTERKEY in keysDown || ESCAPEKEY in keysDown || gamepadControls.Start === true) {
			PAUSE = !PAUSE;
			if (PAUSE) pause(); else unpause();
		// Go back to the Option Screen from Pause
		} else if (PAUSE && (OKEY in keysDown || gamepadControls.Back === true)) {
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
				// Clear Scores if necessary
				if (SCORES.includes(OPTIONS.WINS)) SCORES = SCORES.map(function(value) { return value = 0; });
				// Show Start Message if necessary
				showInputMessage(MESSAGEREADY, -1, true);
				
				lineCtx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
				cycleCtx.clearRect(0, 0, cycleCanvas.width, cycleCanvas.height);
				initializeCycles();

				RESTART = false;
			}
			update();
			render();
		}
	} else if (INPUTMESSAGE) {
		BUTTONPRESS = true;
		const gamepadWinner = getGamepad(INPUTTER);
		if (ENTERKEY in keysDown || gamepadWinner.A === true || gamepadWinner.Start === true) {
			INPUTMESSAGE = false;
			if (READY) {
				BUTTONPRESS = false; // Or else can freeze the game for everyone if hold down on Ready
				READY = false;
				showTimeoutMessage(MESSAGECOUNTDOWN);
			}
		} else {
			BUTTONPRESS = false;
		}
	} else if (Object.keys(keysDown).length === 0 && gamepadControls.none()) { 
		BUTTONPRESS = false;
	}
	return(gamestate);
};

// ----------------------------------------------------------------------------------------------------------------------
//  Load
// ----------------------------------------------------------------------------------------------------------------------

const imageSources = function () {
	const sources = [];
	for (let i = 0; i < MAXPLAYERCOUNT; i++) {
		sources.push("cycle" + i + "h");
		sources.push("cycle" + i + "v");
		sources.push("cycleDie" + i + "h");
		sources.push("cycleDie" + i + "v");
		sources.push("trail" + i);
	}
	sources.push("logo2");
	sources.push("bgTileBlack");
	sources.push("bgTileWhite");
	sources.push("pauseOverlay");
	return sources;
}

function Loader(sources) {
	this.images = {};
    let loadedImageCount = 0;

    for (let i = 0; i < sources.length; i++){
        var img = new Image();
        img.src = "img/" + sources[i] + ".png";
        img.onload = imageLoaded;
        this.images[sources[i]] = img;
    }

    function imageLoaded() {
        loadedImageCount++;
        if (loadedImageCount === sources.length) {
        	// Loading done, start application
            main(STATE.TITLE); 
        }
    }
}

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

//main(STATE.TITLE);

// Preloads and holds images, then it calls main
const loader = new Loader(imageSources());