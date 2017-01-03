// ----------------------------------------------------------------------------------------------------------------------
// Create the canvas'
// ----------------------------------------------------------------------------------------------------------------------

const SCOREDISPLAY = 50;
const MENUBORDER = 8;

// FireFox has an annoying rendering inconsistency with text baseline
let FFTEXTOFFSETTOP = 0;
let FFTEXTOFFSETMIDDLE = 0;
if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
	FFTEXTOFFSETTOP = 10;
	FFTEXTOFFSETMIDDLE = 3;
}

function createCanvas(menu) {
	const canvas = document.createElement("canvas");
	if (menu) {
		canvas.height = window.innerHeight;
	} else {
		canvas.height = window.innerHeight - SCOREDISPLAY;
		canvas.style.marginTop = SCOREDISPLAY + "px";
	}
	canvas.width = window.innerWidth;
	return canvas;
}

function getContext(canvas) {
	const ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = false;
	return ctx;
}

const menuCanvas = createCanvas(true);
const menuCtx = getContext(menuCanvas);
// Trails and Cycles seperated for easier drawing
const cycleCanvas = createCanvas();
const cycleCtx = getContext(cycleCanvas);
const trailCanvas = createCanvas();
const trailCtx = getContext(trailCanvas);

const body = document.body;
body.appendChild(trailCanvas);
body.appendChild(cycleCanvas);
body.appendChild(menuCanvas);

// ----------------------------------------------------------------------------------------------------------------------
//  Global Settings
// ----------------------------------------------------------------------------------------------------------------------

const ENTERKEY = 13;
const ESCAPEKEY = 27;
const OKEY = 79;
const FONT = "Oswald-Regular";

const MAXPLAYERCOUNT = 16;

let CYCLESPEED = 4;
let TRAILWIDTH = 4;

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
	PLAYERCOUNT: MAXPLAYERCOUNT/2,
	WINS: 5,
	THEME: THEMES[0],
	BOOST: false,
	DISAPPEARINGTRAILS: false
}

// These reassigned for smaller cycles
let CYCLELENGTH = 20;
let CYCLEWIDTH = 10;
const CYCLEMARGIN = (CYCLELENGTH - CYCLEWIDTH)/2;

// Actual cycle and trail are hard-coded images, this ultimately applies to just score & winning text
const CYCLECOLOURS = ["rgba(255,0,0,255)", //red
				"rgba(0,0,255,255)", //blue
				"rgba(255,223,0,255)", //yellow
				"rgba(0,255,0,255)", //limegreen
				"rgba(255,165,0,255)", //orange
				"rgba(0,255,255,255)", //cyan
				"rgba(255,0,255,255)", //magenta
				"rgba(119,119,119,255)", //grey
				"rgba(255,165,255,255)", //pink
				"rgba(0,0,119,255)", //darkblue
				"rgba(119,119,0,255)", //olive
				"rgba(0,119,0,255)", //green
				"rgba(119,0,0,255)", //maroon
				"rgba(0,119,119,255)", //teal
				"rgba(119,0,119,255)", //purple
				"rgba(165,165,165,255)"]; //silver

// Note: These correspond with DIR Enumeration
const CYCLEKEYCONTROLS = [[87,65,83,68,69], //wasde
				[84,70,71,72,89], //tfghy
				[73,74,75,76,79], //ijklo
				[38,37,40,39,16], //arrows/shift
				[49,50,51,52,53], //12345
				[54,55,56,57,48], //67890
				[90,88,67,86,66], //zxcvb
				[78,77,188,190,191], //nm,./
				[], // More keys is just a hassle to setup
				[],
				[],
				[],
				[],
				[],
				[],
				[]];

// Dynamic based on OPTIONS.PLAYERCOUNT
function setCycleStarts() {
	//Integer Points on Canvas are more optimized
	const voffset = Math.round(cycleCanvas.height/10); 
	const hoffset = Math.round(cycleCanvas.width/(OPTIONS.PLAYERCOUNT + 1));
	const cyclestarts = [];
	for(let i = 0; i < OPTIONS.PLAYERCOUNT; i += 1) {
		let y = ((i % 2 === 0) ? voffset : cycleCanvas.height - voffset - CYCLELENGTH/2);
		let x = hoffset * (i + 1) - CYCLEWIDTH/2;
		cyclestarts.push([x, y]);
	}
	return cyclestarts;
}

function setCycleSize(playercount) {
	if (playercount <= 8) {
		TRAILWIDTH = 4;
		CYCLELENGTH = 20;
		CYCLEWIDTH = 10;
		CYCLESPEED = 4;
	} else {
		TRAILWIDTH = 2;
		CYCLELENGTH = 8;
		CYCLEWIDTH = 4;
		CYCLESPEED = 3;
	} 
}

// LET THERE BE MUTABLE GLOBAL VARIABLES

// Mutable to reset, ie. map to zero?
let SCORES = new Array(MAXPLAYERCOUNT).fill(0);

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

function toggleFullScreen(elem) {
    // ## The below if statement seems to work better ## if ((document.fullScreenElement && document.fullScreenElement !== null) || (document.msfullscreenElement && document.msfullscreenElement !== null) || (!document.mozFullScreen && !document.webkitIsFullScreen)) {
    if ((document.fullScreenElement !== undefined && document.fullScreenElement === null) || (document.msFullscreenElement !== undefined && document.msFullscreenElement === null) || (document.mozFullScreen !== undefined && !document.mozFullScreen) || (document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen)) {
        if (elem.requestFullScreen) {
            elem.requestFullScreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullScreen) {
            elem.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    } else {
        if (document.cancelFullScreen) {
            document.cancelFullScreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
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

const menuMusic = document.getElementById("menuMusic");
const gameMusic = document.getElementById("gameMusic");

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
	this.alive = true;
	this.id = id; 
	this.x = x; //Center
	this.y = y; //Center
	this.colour = colour; 
	this.controls = controls; //Keyboard
	this.boost = 1; //Multiplier
	this.boostcharge = true; //Set to false to prevent spam
	this.speed = CYCLESPEED;
	this.direction = initialDirection;
	this.directionPrev = initialDirection;
	this.orientation = ((this.direction === DIR.LEFT || this.direction === DIR.RIGHT) ? ORI.HORIZONTAL : ORI.VERTICAL);
	this.xLength = ((this.orientation === ORI.HORIZONTAL) ? CYCLELENGTH : CYCLEWIDTH);
	this.yLength = ((this.orientation === ORI.HORIZONTAL) ? CYCLEWIDTH : CYCLELENGTH);
 	// Similar setup to cycle xLength and yLength
	this.xhbLength = ((this.orientation === ORI.HORIZONTAL) ? this.speed * this.boost : TRAILWIDTH);
	this.yhbLength = ((this.orientation === ORI.HORIZONTAL) ? TRAILWIDTH : this.speed * this.boost); 
	// Pixel Images used because anti-aliasing applied to drawn canvas rectangles
	this.image = loader.images["cycle" + id];
	// Turns is used to trace path and erase on death
	this.turns = [[this.x, this.y]]; //Start Point

 	// Easiest to set Hitbox x and y as always top left corner by case for easiest collision detection
 	// Hitbox can't be centered right now because it would overlap trail and cause suicide
	this.setHitbox = function (direction) {
		if (direction === DIR.RIGHT) {
			this.xhb = this.x; 
			this.yhb = this.y - TRAILWIDTH/2;
		} else if (direction === DIR.LEFT) {
			this.xhb = this.x - this.xhbLength; 
			this.yhb = this.y - TRAILWIDTH/2;
		} else if (direction === DIR.UP) {
			this.xhb = this.x - TRAILWIDTH/2; 
			this.yhb = this.y - this.yhbLength;
		} else if (direction === DIR.DOWN) {
			this.xhb = this.x - TRAILWIDTH/2; 
			this.yhb = this.y;
		}
	}

}

const drawHitbox = function(cycle) {
	// I am an awful person and am using the Hitbox as a boost display for no clear reason
	cycleCtx.fillStyle = (cycle.boostcharge ? "#FFFFFF" : cycle.colour);
	cycleCtx.fillRect(cycle.xhb, cycle.yhb, cycle.xhbLength, cycle.yhbLength);
}

const cycles = [];

const initializeCycles = function() {
	cycles.length = 0; // Empties array
	setCycleSize(OPTIONS.PLAYERCOUNT);
	const cyclestarts = setCycleStarts();
	for(let i = 0; i < OPTIONS.PLAYERCOUNT; i += 1) {
		let initialDirection = ((i % 2 === 0) ? DIR.DOWN : DIR.UP);
		cycles.push(new Cycle(i, cyclestarts[i][0], cyclestarts[i][1], CYCLECOLOURS[i], CYCLEKEYCONTROLS[i], initialDirection));
		cycles[i].setHitbox(initialDirection);
	}
};
	
// ----------------------------------------------------------------------------------------------------------------------
// Handle Controls
// ----------------------------------------------------------------------------------------------------------------------

const keysDown = {};

addEventListener("keydown", function (event) {
	keysDown[event.keyCode] = true;
}, false);
addEventListener("keyup", function (event) {
	delete keysDown[event.keyCode];
}, false);

const getGamepad = function (id) {
	const gamepad = navigator.getGamepads()[id];
	const controls = {
		Up: false,
		Left: false,
		Down: false,
		Right: false,
		Start: false,
		Back: false,
		A: false,
		B: false,
		none: function() {
			for (let control in this) {
	        	if (this[control] === true) return false;
	    	}
	    	return true;
	    }
	};
	// Set controls
	if (gamepad) {
		// 0.3 being makeshift deadzone
		try {
			controls.Up = gamepad.buttons[12].pressed || gamepad.axes[1] < -0.3;
			controls.Left = gamepad.buttons[14].pressed || gamepad.axes[0] < -0.3;
			controls.Down = gamepad.buttons[13].pressed || gamepad.axes[1] > 0.3;
			controls.Right = gamepad.buttons[15].pressed || gamepad.axes[0] > 0.3;
			controls.Start = gamepad.buttons[9].pressed;
			controls.Back = gamepad.buttons[8].pressed;
			controls.A = gamepad.buttons[0].pressed;
			controls.B = gamepad.buttons[1].pressed;
		} catch (err) {
			console.log(`Controller ${gamepad.index} ${gamepad.id} Unsupported :(`);
		}
	}
	return controls;
};

// ----------------------------------------------------------------------------------------------------------------------
//  Movement & Collision
// ----------------------------------------------------------------------------------------------------------------------

const activateBoost = function(cycle) {
	if (OPTIONS.BOOST && cycle.boostcharge) {
		boostSound.currentTime = 0; boostSound.play();
		cycle.boost = 2;
		cycle.boostcharge = false;
		// Implementation is bad because it will timeout during Pause
		setTimeout(function() {
			cycle.boost = 1;
		}, 500);
		setTimeout(function() {
			cycle.boostcharge = true;
		}, 3000);
	}
}

const movement = function(cycle) {

	// Erase previous drawing
	cycleCtx.clearRect(cycle.x - cycle.xLength/2, cycle.y - cycle.yLength/2, cycle.xLength, cycle.yLength);
	
	// Get relevant controls
	const keyboard = cycle.controls;
	const gamepad = getGamepad(cycle.id);
	
	// Set cycle orientation and direction
	// Cycles can't turn backwards
	if (keyboard[DIR.UP] in keysDown || gamepad.Up === true) {
		if (cycle.direction !== DIR.DOWN) { 
			cycle.direction = DIR.UP;
			cycle.orientation = ORI.VERTICAL;
		}
	} else if (keyboard[DIR.LEFT] in keysDown || gamepad.Left === true) {
		if (cycle.direction !== DIR.RIGHT) {
			cycle.direction = DIR.LEFT;
			cycle.orientation = ORI.HORIZONTAL;
		}
	} else if (keyboard[DIR.DOWN] in keysDown || gamepad.Down === true) {
		if (cycle.direction !== DIR.UP) { 
			cycle.direction = DIR.DOWN;
			cycle.orientation = ORI.VERTICAL;
		}
	} else if (keyboard[DIR.RIGHT] in keysDown || gamepad.Right === true) {
		if (cycle.direction !== DIR.LEFT) {	
			cycle.direction = DIR.RIGHT;
			cycle.orientation = ORI.HORIZONTAL;
		}
	}

	// Last key in controls is boost
	if (keyboard[keyboard.length - 1] in keysDown || gamepad.A === true) {
		activateBoost(cycle);
	}
	
	if (cycle.directionPrev !== cycle.direction) {
		// Swap these values
		// You never go backwards so orientation always changes when direction does
		[cycle.xLength, cycle.yLength] = [cycle.yLength, cycle.xLength];
		[cycle.xhblength, cycle.yhbLength] = [cycle.yhbLength, cycle.xhbLength];

		// Track turns of cycle for erasing on death
		cycle.turns.push([cycle.x, cycle.y]);
		cycle.directionPrev = cycle.direction;
	}

	// Update location and add trail
	switch (cycle.direction) {
		case DIR.UP:
			cycle.x = cycle.x;
			cycle.y = cycle.y - cycle.speed * cycle.boost;
			trailCtx.drawImage(
				cycle.image, //image
				cycle.x - TRAILWIDTH/2, //x
				cycle.y, //y
				TRAILWIDTH, //xLength
				cycle.speed * cycle.boost); //yLength
			break;
		case DIR.LEFT:
			cycle.x = cycle.x - cycle.speed * cycle.boost;
			cycle.y = cycle.y;
			trailCtx.drawImage(
				cycle.image,
				cycle.x,
				cycle.y - TRAILWIDTH/2,
				cycle.speed * cycle.boost,
				TRAILWIDTH);
			break;
		case DIR.DOWN:
			cycle.x = cycle.x;
			cycle.y = cycle.y + cycle.speed * cycle.boost;
			trailCtx.drawImage(
				cycle.image,
				cycle.x - TRAILWIDTH/2,
				cycle.y - cycle.speed * cycle.boost,
				TRAILWIDTH,
				cycle.speed * cycle.boost);
			break;
		case DIR.RIGHT:
			cycle.x = cycle.x + cycle.speed * cycle.boost;
			cycle.y = cycle.y;
			trailCtx.drawImage(
				cycle.image,
				cycle.x - cycle.speed * cycle.boost,
				cycle.y - TRAILWIDTH/2,
				cycle.speed * cycle.boost,
				TRAILWIDTH);
			break;
		default:
			cycle.x = cycle.x;
			cycle.y = cycle.y;
	}

	// Need to update hitbox coordinates with movement
	cycle.setHitbox(cycle.direction);
};

const collisionCheck = function(cycle) {

	// Check Boundary Collision
	if (cycle.xhb < 0 || cycle.yhb < 0 || cycle.xhb + cycle.xhbLength > cycleCanvas.width || cycle.yhb + cycle.yhbLength > cycleCanvas.height) {
		killCycle(cycle);
		return;
	}

	// Check Cycle Collision First
	cycles.forEach(function(othercycle) {
		if (othercycle.id !== cycle.id) {
			if (othercycle.alive === true) {
				const cyclexhbEdge = cycle.xhb + cycle.xhbLength;
				const cycleyhbEdge = cycle.yhb + cycle.yhbLength;
				const otherxhbEdge = othercycle.xhb + othercycle.xhbLength;
				const otheryhbEdge = othercycle.yhb + othercycle.yhbLength;

				if (cycle.xhb <= otherxhbEdge
				&& othercycle.xhb <= cyclexhbEdge
				&& cycle.yhb <= otheryhbEdge
				&& othercycle.yhb <= cycleyhbEdge) {
					killCycle(cycle);
					killCycle(othercycle);
					return;
				}
			} 
		}
	});
	
	// Check Trail Collision
	// Image Data is RGBαRGBαRGBα... of each pixel in selection
	// Note that getImageData() & files written to cycleCanvas create a security issue, so game must be run on a server or annoying options set to allow images
	const hitbox = trailCtx.getImageData(cycle.xhb, cycle.yhb, cycle.xhbLength, cycle.yhbLength).data;
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
	cycle.turns.push([cycle.x, cycle.y]);  // End Point
	eraseTrail(cycle);
};

const eraseTrail = function(cycle) {
	// Traces turns and erases just player's lines
	const turns = cycle.turns;
	for (let i = 1; i < turns.length; i += 1) {
		if (turns[i-1][0] !== turns[i][0]) { //Horizontal Trail
			trailCtx.clearRect(Math.min(turns[i-1][0], turns[i][0]), turns[i][1] - TRAILWIDTH/2, Math.abs(turns[i-1][0] - turns[i][0]), TRAILWIDTH); //Erase Old Pixels
		} else { //Vertical Trail
			trailCtx.clearRect(turns[i][0] - TRAILWIDTH/2, Math.min(turns[i-1][1], turns[i][1]), TRAILWIDTH, Math.abs(turns[i-1][1] - turns[i][1])); //Erase Old Pixels
		}
	}
};

const eraseCycle = function(cycle) {
	let deathAnimation = loader.images["cycleDie" + cycle.id];
	let i = 1;
	const animationFrames = 6;
	const drawDeath = setInterval(function() {
		cycleCtx.clearRect(cycle.x - cycle.xLength/2, cycle.y - cycle.yLength/2, cycle.xLength, cycle.yLength);
		cycleCtx.drawImage(deathAnimation, (i % 2) * 20, (Math.floor(i/2) % 3) * 20, cycle.xLength, cycle.yLength, cycle.x - cycle.xLength/2, cycle.y - cycle.yLength/2, cycle.xLength, cycle.yLength);
		i += 1;
		if (i === animationFrames) clearInterval(drawDeath);
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

	if (turns.length > 1) {
		trailCtx.fillStyle = "grey";
		if (turns[0][0] < turns[1][0]) { // Right
			trailCtx.clearRect(turns[0][0], turns[0][1] - TRAILWIDTH/2, cycle.speed * cycle.boost, TRAILWIDTH); //Erase Old Pixels
			cycle.turns[0][0] = turns[0][0] + cycle.speed * cycle.boost;
			if (turns[0][0] === turns[1][0] && turns[0][1] === turns[1][1]) {
				turns.shift();
				trailCtx.clearRect(turns[0][0], turns[0][1] - TRAILWIDTH/2, cycle.speed * cycle.boost, TRAILWIDTH); //Erase Old Pixels
			}
		} else if (turns[0][0] > turns[1][0]) { // Left
			trailCtx.clearRect(turns[0][0] - cycle.speed * cycle.boost, turns[0][1] - TRAILWIDTH/2, cycle.speed * cycle.boost, TRAILWIDTH); //Erase Old Pixels
			cycle.turns[0][0] = turns[0][0] - cycle.speed * cycle.boost;
			if (turns[0][0] === turns[1][0] && turns[0][1] === turns[1][1]) {
				turns.shift();
				trailCtx.clearRect(turns[0][0] - cycle.speed * cycle.boost, turns[0][1] - TRAILWIDTH/2, cycle.speed * cycle.boost, TRAILWIDTH); //Erase Old Pixels
			}
		// Something's weirdly backwards about these two compared to Left/Right and turns.length === 1
		} else if (turns[0][1] < turns[1][1]) { // Up
			cycle.turns[0][1] = turns[0][1] + cycle.speed * cycle.boost;
			trailCtx.clearRect(turns[0][0] - TRAILWIDTH/2, turns[0][1] - cycle.speed * cycle.boost, TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			if (turns[0][0] === turns[1][0] && turns[0][1] === turns[1][1]) {
				turns.shift();
				trailCtx.clearRect(turns[0][0] - TRAILWIDTH/2, turns[0][1] - cycle.speed * cycle.boost, TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			}
		} else if (turns[0][1] > turns[1][1]) { // Down
			cycle.turns[0][1] = turns[0][1] - cycle.speed * cycle.boost;
			trailCtx.clearRect(turns[0][0] - TRAILWIDTH/2, turns[0][1], TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			if (turns[0][0] === turns[1][0] && turns[0][1] === turns[1][1]) {
				turns.shift();
				trailCtx.clearRect(turns[0][0] - TRAILWIDTH/2, turns[0][1], TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			}
		}
	} else {
		if (cycle.direction === DIR.RIGHT) { // Right
			trailCtx.clearRect(turns[0][0], turns[0][1] - TRAILWIDTH/2, cycle.speed * cycle.boost, TRAILWIDTH); //Erase Old Pixels
			cycle.turns[0][0] = turns[0][0] + cycle.speed * cycle.boost;
		} else if (cycle.direction === DIR.LEFT) { // Left
			trailCtx.clearRect(turns[0][0] - cycle.speed * cycle.boost, turns[0][1] - TRAILWIDTH/2, cycle.speed * cycle.boost, TRAILWIDTH); //Erase Old Pixels
			cycle.turns[0][0] = turns[0][0] - cycle.speed * cycle.boost;
		} else if (cycle.direction === DIR.UP) { // Up
			trailCtx.clearRect(turns[0][0] - TRAILWIDTH/2, turns[0][1] - cycle.speed * cycle.boost, TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			cycle.turns[0][1] = turns[0][1] - cycle.speed * cycle.boost;
		} else if (cycle.direction === DIR.DOWN) { // Down
			trailCtx.clearRect(turns[0][0] - TRAILWIDTH/2, turns[0][1], TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
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

	//Cycle display
	cycles.forEach(function(cycle) {
		if (cycle.alive === true) { 
			cycleCtx.drawImage(cycle.image, cycle.x - cycle.xLength/2, cycle.y - cycle.yLength/2, cycle.xLength, cycle.yLength);
			if (OPTIONS.BOOST) drawHitbox(cycle);
		}
	});
	
	// Score Display // Not sure why repeated
	menuCtx.fillStyle = OPTIONS.THEME.TEXT;
	menuCtx.fillRect(0, SCOREDISPLAY - MENUBORDER, menuCanvas.width, MENUBORDER);
	menuCtx.fillStyle = OPTIONS.THEME.COLOUR;
	menuCtx.fillRect(0, 0, menuCanvas.width, SCOREDISPLAY - MENUBORDER);
	menuCtx.font = "24px " + FONT;
	menuCtx.textBaseline = "top";
	// Logo
	menuCtx.fillStyle = OPTIONS.THEME.TEXT;
	menuCtx.textAlign = "left";
	menuCtx.fillText("LIGHT ANGLES", 10, 5 + FFTEXTOFFSETTOP)
	menuCtx.textAlign = "right";
	menuCtx.fillText("LIGHT ANGLES", menuCanvas.width - 10, 5 + FFTEXTOFFSETTOP)
	// Score
	menuCtx.textAlign = "center";
	cycles.forEach(function(cycle) {
		menuCtx.fillStyle = cycle.colour;
		menuCtx.fillText(SCORES[cycle.id], menuCanvas.width / 2 - (OPTIONS.PLAYERCOUNT * 30 / 2) + 30 * cycle.id, 5 + FFTEXTOFFSETTOP);
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
	menuCtx.lineWidth = MENUBORDER;
	menuCtx.fillRect(menuCanvas.width/2 - 120, menuCanvas.height/2 - 50, 240, 100);
	menuCtx.strokeRect(menuCanvas.width/2 - 120, menuCanvas.height/2 - 50, 240, 100);
	
	// Write Message
	menuCtx.font = "30px " + FONT;
	menuCtx.textAlign = "center";
	menuCtx.textBaseline = "middle";
	menuCtx.fillStyle = OPTIONS.THEME.TEXT;
	menuCtx.fillText(message, menuCanvas.width/2, menuCanvas.height/2 + FFTEXTOFFSETMIDDLE);
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
		menuCtx.lineWidth = MENUBORDER;
		
		if (timer !== messages.length) {
			countSound.currentTime = 0; countSound.play();
			menuCtx.font = 24 * (timer + 3) + "px " + FONT;
			menuCtx.fillText(messages[timer], menuCanvas.width/2, menuCanvas.height/2 + FFTEXTOFFSETMIDDLE);
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
	
	const gamepad = getGamepad(0);

	if (!BUTTONPRESS) {
		if (ENTERKEY in keysDown || gamepad.A === true || gamepad.Start === true) {
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
	menuCtx.textBaseline = "middle";

	// Write Option Text
	// Some of this positioning is weird
	menuCtx.fillStyle = OPTIONS.THEME.TEXTALT;
	menuCtx.fillText("Press Start or [Enter] to Begin", menuCanvas.width/2, menuCanvas.height/2 - 30 * 3.5);
	menuCtx.fillStyle = OPTIONS.THEME.TEXT;

	// Controller Indicators
	for (let i = 0; i < OPTIONS.PLAYERCOUNT; i++) {
		menuCtx.fillStyle = CYCLECOLOURS[i];
		const gamepad = getGamepad(i);
		if (gamepad.A === true) {
			menuCtx.fillRect(menuCanvas.width / 2 - (OPTIONS.PLAYERCOUNT * 20 / 2) + 20 * i + 10, menuCanvas.height/2 - 30 * 5, 20, 20);
		} else {
			menuCtx.fillRect(menuCanvas.width / 2 - (OPTIONS.PLAYERCOUNT * 20 / 2) + 20 * i + 5, menuCanvas.height/2 - 30 * 5, 10, 10);
		}
	}
	
	// Write Option Text
	const optionmessages = ["Players: " + OPTIONS.PLAYERCOUNT,
				"Wins: " + OPTIONS.WINS,
				"Theme: " + OPTIONS.THEME.NAME,
				"Boost: " + (OPTIONS.BOOST ? "Yes" : "No"),
				"Disappearing Trails: " + (OPTIONS.DISAPPEARINGTRAILS ? "Yes" : "No")];
	for (let i = 0; i < optionmessages.length; i++) {
		// Highlight value is updated by controls
		menuCtx.fillStyle = (i === HIGHLIGHT ? OPTIONS.THEME.TEXTHIGHLIGHT : OPTIONS.THEME.TEXT);
		menuCtx.fillText(optionmessages[i], menuCanvas.width/2, menuCanvas.height/2 - 30 * (optionmessages.length/2 - i));
	}
	
	// Handle Option Controls
	const gamepad = getGamepad(0);
	if (!BUTTONPRESS) {
		BUTTONPRESS = true;
		// Enter/A/Start --> Start the Game
		if (ENTERKEY in keysDown || gamepad.Start === true) {
			menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
			gamestate = STATE.GAME;
			selectSound.currentTime = 0; selectSound.play();
		// Up --> Move Highlight
		} else if (CYCLEKEYCONTROLS[0][0] in keysDown || gamepad.Up === true) {
			console.log(navigator.getGamepads());
			HIGHLIGHT = mod((HIGHLIGHT - 1), Object.keys(OPTIONS).length);
			optionSound.currentTime = 0; optionSound.play();
		// Down --> Move Highlight
		} else if (CYCLEKEYCONTROLS[0][2] in keysDown || gamepad.Down === true) { 
			console.log(navigator.getGamepads());
			HIGHLIGHT = mod((HIGHLIGHT + 1), Object.keys(OPTIONS).length);
			optionSound.currentTime = 0; optionSound.play();
		// Left/Right --> Change Option
		} else if ((CYCLEKEYCONTROLS[0][1] in keysDown || gamepad.Left === true) 
				|| (CYCLEKEYCONTROLS[0][3] in keysDown || gamepad.Right === true)) {

			const left = CYCLEKEYCONTROLS[0][1] in keysDown || gamepad.Left === true;
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
		// Special Options: Fullscreen or Reload Game with Controller
		} else if (gamepad.Back === true) {
			toggleFullScreen(document.documentElement);
		} else if (gamepad.B === true) {
			window.location.reload();
		} else {
			BUTTONPRESS = false;
		}
	} else if (Object.keys(keysDown).length === 0 && gamepad.none()) { 
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

	const gamepad = getGamepad(0);

	if (!BUTTONPRESS && !MESSAGE && !INPUTMESSAGE) {
		BUTTONPRESS = true;
		// Pause the Game
		if (ENTERKEY in keysDown || ESCAPEKEY in keysDown || gamepad.Start === true) {
			PAUSE = !PAUSE;
			if (PAUSE) pause(); else unpause();
		// Go back to the Option Screen from Pause
		} else if (PAUSE && (OKEY in keysDown || gamepad.Back === true)) {
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
				
				trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
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
	} else if (Object.keys(keysDown).length === 0 && gamepad.none()) { 
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
		sources.push("cycle" + i);
		sources.push("cycleDie" + i);
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

// Preloads and holds images, then it calls main
const loader = new Loader(imageSources());