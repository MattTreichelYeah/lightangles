// ----------------------------------------------------------------------------------------------------------------------
// Disclaimer
// ----------------------------------------------------------------------------------------------------------------------

// There's some embarassingly stupid code in here
// Classic layered spaghetti

// ----------------------------------------------------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------------------------------------------------

// Dimensions
const SCOREHEIGHT = 50; // Score Display
const MENUBORDER = 8; // Borders of Menu boxes like Score Display and Messages

// Presentation
const FONT = "Bungee-Regular";

// Keyboard
const ENTERKEY = 13;
const ESCAPEKEY = 27;
const OKEY = 79;

// Controller (XInput Assumed Default)
// Usually different ID strings across both Browser & OS types
const CONTROLLER360 = "45e-28e-Wireless 360 Controller";
const CONTROLLER3602 = "045e-028e-Controller (XBOX 360 For Windows)";
const CONTROLLER3603= "045e-02a1-Controller (Xbox 360 Wireless Receiver for Windows)";
const CONTROLLER360WIRED = "45e-28e-Xbox 360 Wired Controller";
const CONTROLLERPS4 = "054c-09cc-Wireless Controller";
const CONTROLLERPS3 = "54c-268-PLAYSTATION(R)3 Controller";
const CONTROLLERPS2 = "0810-0003-USB Gamepad ";
const CONTROLLERWIIUPRO = "0079-1800-Mayflash WiiU Pro Game Controller Adapter";
const CONTROLLERWIIUPRO2 = "79-1800-Mayflash WiiU Pro Game Controller Adapter";
const CONTROLLERJOYCONL = "057e-2006-Wireless Gamepad";
const CONTROLLERJOYCONL2 = "57e-2006-Joy-Con (L)";
const CONTROLLERJOYCONL3 = "Joy-Con (L) (Vendor: 057e Product: 2006)";
const CONTROLLERJOYCONR = "057e-2007-Wireless Gamepad";
const CONTROLLERJOYCONR2 = "57e-2007-Joy-Con (R)";
const CONTROLLERJOYCONR3 = "Joy-Con (R) (Vendor: 057e Product: 2007)";
const CONTROLLERGAMECUBE = "1234-bead-vJoy - Virtual Joystick";
const CONTROLLERGAMECUBE2 = "0079-1844-MAYFLASH GameCube Controller Adapter";

// Hard Game Rules
const MAXPLAYERCOUNT = 32;

function Theme(name, colour, background, backgroundAlt, text, textHighlight, image, tag) {
	this.NAME = name;
	this.TAG = tag;
	this.COLOUR = colour;
	this.BACKGROUND = background;
	this.BACKGROUNDALT = backgroundAlt;
	this.TEXT = text;
	this.TEXTHIGHLIGHT = textHighlight;
	this.TEXTALT = "#A1A4A4";
	this.IMAGE = new Image();
	this.IMAGE.src = image;
}
const BLACKTHEME = new Theme("Black", "#000000", "url('img/bgTileBlack2.png')", "url('img/bgTileBlack2alt.png')", "#FFFFFF", "#FF0000", "img/white.png", "");
const WHITETHEME = new Theme("White", "#FFFFFF", "url('img/bgTileWhite2.png')", "url('img/bgTileWhite2alt.png')", "#000000", "#FF0000", "img/black.png", "alt");
const THEMES = [BLACKTHEME, WHITETHEME];

// External - Directly Changeable
const OPTIONS = { 
	PLAYERCOUNT: 8,
	WINS: 5,
	THEME: THEMES[0],
	BOOST: true,
	DISAPPEARINGTRAILS: false
}

// Internal - Constant or Indirectly Changeable
const PROPERTIES = {
	CYCLESPEED: 4,
	CYCLELENGTH: 20, // Assuming vertical orientation
	CYCLEWIDTH: 10,
	TRAILWIDTH: 4,
	DISAPPEARTIME: 1000,
	ADJUSTPLAYERCOUNT: function (playercount) {
		if (playercount <= 8) {
			this.TRAILWIDTH = 4;
			this.CYCLELENGTH = 20;
			this.CYCLEWIDTH = 10;
			this.CYCLESPEED = 4;
		} else {
			this.TRAILWIDTH = 2;
			this.CYCLELENGTH = 8;
			this.CYCLEWIDTH = 4;
			this.CYCLESPEED = 3;
		} 
	}
}

const DISAPPEAR = {
	timeout: null,
	started: false
}

// Actual cycle and trail are images to avoid automatic canvas anti-aliasing
// This ultimately applies to just menu indicators
// Scratch the above - this is used to avoid suicide on initial drawn trail,
// and due to an canvas quirk have to be reassigned later to whatever the browser slightly adjusts the raw colour to (see following function)
const CYCLECOLOURS = ["rgba(255,0,0,1)", //red
				"rgba(0,81,255,1)", //blue
				"rgba(255,223,0,1)", //yellow
				"rgba(0,255,0,1)", //limegreen
				"rgba(255,165,0,1)", //orange
				"rgba(0,255,255,1)", //cyan
				"rgba(255,0,255,1)", //magenta
				"rgba(119,119,119,1)", //grey
				"rgba(255,165,255,1)", //pink
				"rgba(119,119,0,1)", //olive
				"rgba(255,223,119,1)", //beige
				"rgba(0,119,0,1)", //green
				"rgba(255,119,127,1)", //salmon
				"rgba(195,175,255,1)", //lavender
				"rgba(119,0,119,1)", //purple
				"rgba(165,165,165,1)", //silver
				"rgba(133,255,133,1)", //pastelgreen
				"rgba(0,119,119,1)", //teal
				"rgba(255,80,0,1)", //oranger
				"rgba(129,205,232,1)", //aqua
				"rgba(190,0,0,1)", //darkred
				"rgba(190,0,255,1)", //purpler
				"rgba(0,180,255,1)", //blueish
				"rgba(255,223,200,1)", //salmony
				"rgba(119,0,0,1)", //maroon
				"rgba(200,223,119,1)", //puke
				"rgba(255,190,0,1)", //gold
				"rgba(255,0,135,1)", //cherry
				"rgba(149,255,210,1)", //glow
				"rgba(255,196,135,1)", //paleorange
				"rgba(0,190,0,1)", //greener
				OPTIONS.THEME.TEXT, //white
				];

// Canvas doesn't output exact colour of image apparently, need to read the colour after drawn
function setColor(cycle) {
	menuCtx.drawImage(cycle.image, 0, 0, 1, 1);
	const pixel = menuCtx.getImageData(0, 0, 1, 1).data;
	const pixelcolour = "rgba(" + pixel[0] + "," + pixel[1] + "," + pixel[2] + "," + pixel[3] + ")";
	cycle.colour = pixelcolour;
	menuCtx.clearRect(0, 0, 1, 1);
}

// Note: These correspond with DIR Enumeration, and Boost
// Keyboard Controls provided for players 1-2 for testing 
// and players 9-16 to support remapping when browser controller support fails
const CYCLEKEYCONTROLS = [[87,65,83,68,69], //wasde
				[84,70,71,72,89], //tfghy
				[],
				[],
				[],
				[],
				[],
				[],
				[187,219,221,220,189], //+[]\-
				[80,186,222,85,82], //p;'ur
				[73,74,75,76,79], //ijklo
				[38,37,40,39,16], //arrows/shift
				[49,50,51,52,53], //12345
				[54,55,56,57,48], //67890
				[90,88,67,86,66], //zxcvb
				[78,77,188,190,191], //nm,./
				[],
				[],
				[],
				[],
				[],
				[],
				[],
				[],
				[],
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
		let y = ((i % 2 === 0) ? voffset : cycleCanvas.height - voffset);
		let x = hoffset * (i + 1) - PROPERTIES.CYCLEWIDTH/2;
		cyclestarts.push([x, y]);
	}
	return cyclestarts;
}

// FireFox has an annoying rendering inconsistency with text baseline
CanvasRenderingContext2D.prototype.fillTextCustom = function(text, x, y) { 
	let yOffset = 0;
	if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
		// Haven't needed other baselines
		if (this.textBaseline === "top") yOffset = 10;
		else if (this.textBaseline === "middle") yOffset = 3;
	}
	this.fillText(text, x, y + yOffset);
}

CanvasRenderingContext2D.prototype.clearCanvas = function(canvas) { 
	this.clearRect(0, 0, canvas.width, canvas.height);
}

Audio.prototype.playSoundEffect = function () {
	this.currentTime = 0; 
	this.play();
}

// Fix JavaScript mod for negative numbers
function mod(n, m) {
	return ((n % m) + m) % m;
}

// Experimental FullScreen API, slightly different from F11-view
// Only works when triggered by a user-event, which the gamepad (maybe?) can't invoke because it's also experimental
// Works with custom FireFox 'about:config' settings: (not recommended if using the browser regularly)
// full-screen-api.allow-trusted-requests-only: false
function toggleFullScreen(elem) {
	if ((document.fullScreenElement !== undefined && document.fullScreenElement === null) || 
		(document.msFullscreenElement !== undefined && document.msFullscreenElement === null) || 
		(document.mozFullScreen !== undefined && !document.mozFullScreen) || 
		(document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen)) {
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

// Works with custom FireFox 'about:config' settings: (not recommended if using the browser regularly)
// full-screen-api.unprefix.enabled: true
document.onfullscreenchange = function (event) { 
	setCanvasDimensions(menuCanvas, true);
	setCanvasDimensions(cycleCanvas);
	setCanvasDimensions(trailCanvas);
}

// LET THERE BE MUTABLE GLOBAL VARIABLES
// Ground Zero for refactoring
// Mutable to reset, ie. map to zero?
let SCORES = new Array(MAXPLAYERCOUNT).fill(0);
const cycles = [];
let HIGHLIGHT = 0;		
let PAUSE = false;
let RESTART = true;
let MESSAGE = false;
let INPUTMESSAGE = false;
let INPUTTER = 0;
let READY = false;
let BUTTONPRESSED = false;
let TITLEPOSITIONX = 0;
let TITLEPOSITIONY = 0;
let TITLESCALE = 0;
let TITLESCALEUP = true;
let TITLEPOSITIONUP = true;
let BACKGROUNDCOUNT = 0;
let BACKGROUNDSPEED = 60;
let BACKGROUNDJAMMIN = false;
let TITLEMUSICJAMMIN = false;
let COLOURJAM = 0;

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
deathSound.volume = 0.1;
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

function loopAudio (audio, loopTime, restartTime) {
	if (gameMusic.currentTime >= loopTime) {
		// Unavoidable delay, but not too noticeable
		gameMusic.currentTime = restartTime;
	}
}

// ----------------------------------------------------------------------------------------------------------------------
// Create the canvas'
// ----------------------------------------------------------------------------------------------------------------------

// There are 3 canvas' to simplify drawing and collision detection
// The Menu canvas covers the whole screen, while the others are the playfield below the Score Display

function createCanvas(isMenu) {
	const canvas = document.createElement("canvas");
	setCanvasDimensions(canvas, isMenu);
	return canvas;
}

function setCanvasDimensions(canvas, isMenu) {
	if (isMenu) {
		canvas.height = window.innerHeight;
	} else {
		canvas.height = window.innerHeight - SCOREHEIGHT;
		canvas.style.marginTop = `${SCOREHEIGHT}px`;
	}
	canvas.width = window.innerWidth;
}

function getContext(canvas) {
	const ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = false;
	return ctx;
}

const menuCanvas = createCanvas(true);
const menuCtx = getContext(menuCanvas);
const cycleCanvas = createCanvas();
const cycleCtx = getContext(cycleCanvas);
const trailCanvas = createCanvas();
const trailCtx = getContext(trailCanvas);

const body = document.body;
// The layering is important
// Cycles above their Trails and Menus above playfield
body.appendChild(trailCanvas);
body.appendChild(cycleCanvas);
body.appendChild(menuCanvas);

// ----------------------------------------------------------------------------------------------------------------------
// Game Objects
// ----------------------------------------------------------------------------------------------------------------------

function Cycle(id, x, y, colour, controls, initialDirection, cpu) { 
	this.alive = true;
	this.cpu = cpu;
	this.cpuMoveTendency = Math.random() * (0.01 - 0.005) + 0.005; // Randomize tendency of turning
	this.id = id; 
	this.x = x; //Center
	this.y = y; //Center
	this.colour = colour; 
	this.controls = controls; //Keyboard
	this.boost = 1; //Multiplier
	this.boostcharge = true; //Set to false to prevent spam
	this.speed = PROPERTIES.CYCLESPEED;
	this.direction = initialDirection;
	this.directionPrev = initialDirection;
	this.orientation = ((this.direction === DIR.LEFT || this.direction === DIR.RIGHT) ? ORI.HORIZONTAL : ORI.VERTICAL);
	this.xLength = ((this.orientation === ORI.HORIZONTAL) ? PROPERTIES.CYCLELENGTH : PROPERTIES.CYCLEWIDTH);
	this.yLength = ((this.orientation === ORI.HORIZONTAL) ? PROPERTIES.CYCLEWIDTH : PROPERTIES.CYCLELENGTH);
	// Pixel Images used because anti-aliasing applied to drawn canvas rectangles
	let alt = (this.id === MAXPLAYERCOUNT - 1) ? OPTIONS.THEME.TAG : "";
	this.image = loader.images["cycle" + id + alt];
	// console.log(this.image.src)
	// Turns is used to trace path and erase on death
	this.turns = [[this.x, this.y]]; //Start Point

	// Easiest to set Hitbox x and y as always top left corner by case for easiest collision detection
	// Hitbox is intended to cover from a quarter from the cycle's front, back to the amount of speed * boost
	this.setHitbox = function (direction, orientation) {
		this.xhbLength = ((orientation === ORI.HORIZONTAL) ? this.speed * this.boost : PROPERTIES.TRAILWIDTH);
		this.yhbLength = ((orientation === ORI.HORIZONTAL) ? PROPERTIES.TRAILWIDTH : this.speed * this.boost);
		if (direction === DIR.RIGHT) {
			this.xhb = this.x - this.xhbLength + PROPERTIES.CYCLELENGTH / 4; 
			this.yhb = this.y - PROPERTIES.TRAILWIDTH/2;
		} else if (direction === DIR.LEFT) {
			this.xhb = this.x - PROPERTIES.CYCLELENGTH / 4; 
			this.yhb = this.y - PROPERTIES.TRAILWIDTH/2;
		} else if (direction === DIR.UP) {
			this.xhb = this.x - PROPERTIES.TRAILWIDTH/2; 
			this.yhb = this.y - PROPERTIES.CYCLELENGTH / 4;			
		} else if (direction === DIR.DOWN) {
			this.xhb = this.x - PROPERTIES.TRAILWIDTH/2; 
			this.yhb = this.y - this.yhbLength + PROPERTIES.CYCLELENGTH / 4;
		}
	}

}

function drawHitbox(cycle) {
	// I am an awful person and am using the Hitbox as a boost display for no clear reason
	cycleCtx.fillStyle = (cycle.boostcharge ? OPTIONS.THEME.TEXT : cycle.colour);
	if (cycle.boostcharge && cycle.id === MAXPLAYERCOUNT - 1) cycleCtx.fillStyle = OPTIONS.THEME.TEXTALT;
	cycleCtx.fillRect(cycle.xhb, cycle.yhb, cycle.xhbLength, cycle.yhbLength);
}

function initializeCycles() {
	cycles.length = 0; // Empties array
	PROPERTIES.ADJUSTPLAYERCOUNT(OPTIONS.PLAYERCOUNT);
	const cyclestarts = setCycleStarts();
	for(let i = 0; i < OPTIONS.PLAYERCOUNT; i += 1) {
		let initialDirection = ((i % 2 === 0) ? DIR.DOWN : DIR.UP);
		let cpu = !getGamepad(i).exists;
		cycles.push(new Cycle(i, cyclestarts[i][0], cyclestarts[i][1], CYCLECOLOURS[i], CYCLEKEYCONTROLS[i], initialDirection, cpu));
		setColor(cycles[i]);
		cycles[i].setHitbox(initialDirection, ORI.VERTICAL);
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

function Controls() {
	this.exists = false;
	this.Up = false,
	this.Left = false,
	this.Down = false,
	this.Right = false,
	this.Start = false,
	this.Back = false,
	this.A = false,
	this.B = false,
	this.none = function() {
		for (let control in this) {
			if (control !== "exists" && this[control] === true) return false;
		}
		return true;
	}
}

function getGamepad(id) {
	const gamepads = navigator.getGamepads();
	const controls = new Controls();
	if (id < gamepads.length) { // Or Controller Unconnected
		const gamepad = gamepads[id];
		if (gamepad) {
			// 0.3 being makeshift deadzone
			try {
				// Browser stopped reading Wii U Dpad Inputs, so needs an alternate mapping
				switch (gamepad.id) {
					case CONTROLLERJOYCONL:
					case CONTROLLERJOYCONL2:
					case CONTROLLERJOYCONL3:
						controls.Up = gamepad.buttons[2].pressed;
						controls.Left = gamepad.buttons[0].pressed;
						controls.Down = gamepad.buttons[1].pressed;
						controls.Right = gamepad.buttons[3].pressed;
						controls.Start = gamepad.buttons[8].pressed;
						controls.Back = gamepad.buttons[10].pressed;
						controls.A = gamepad.buttons[14].pressed;
						controls.B = gamepad.buttons[15].pressed;
						break;
					case CONTROLLERJOYCONR:
					case CONTROLLERJOYCONR2:
					case CONTROLLERJOYCONR3:
						controls.Up = gamepad.buttons[1].pressed;
						controls.Left = gamepad.buttons[3].pressed;
						controls.Down = gamepad.buttons[2].pressed;
						controls.Right = gamepad.buttons[0].pressed;
						controls.Start = gamepad.buttons[9].pressed;
						controls.Back = gamepad.buttons[11].pressed;
						controls.A = gamepad.buttons[14].pressed;
						controls.B = gamepad.buttons[15].pressed;
						break;
					case CONTROLLERWIIUPRO:
					case CONTROLLERWIIUPRO2:
						controls.Up = gamepad.buttons[12].pressed || gamepad.buttons[3].pressed || gamepad.axes[1] < -0.3;
						controls.Left = gamepad.buttons[14].pressed || gamepad.buttons[0].pressed || gamepad.axes[0] < -0.3;
						controls.Down = gamepad.buttons[13].pressed || gamepad.buttons[1].pressed || gamepad.axes[1] > 0.3;
						controls.Right = gamepad.buttons[15].pressed || gamepad.buttons[2].pressed || gamepad.axes[0] > 0.3;
						controls.Start = gamepad.buttons[9].pressed;
						controls.Back = gamepad.buttons[8].pressed;
						controls.A = gamepad.buttons[5].pressed || gamepad.buttons[4].pressed;
						controls.B = gamepad.buttons[6].pressed || gamepad.buttons[7].pressed;
						break;
					case CONTROLLER360:
					case CONTROLLER360WIRED:
						controls.Up = gamepad.buttons[1].pressed;
						controls.Left = gamepad.buttons[3].pressed;
						controls.Down = gamepad.buttons[0].pressed;
						controls.Right = gamepad.buttons[2].pressed;
						controls.Start = gamepad.buttons[4].pressed;
						controls.Back = gamepad.buttons[5].pressed;
						controls.A = gamepad.buttons[11].pressed;
						controls.B = gamepad.buttons[12].pressed;
						break;
					case CONTROLLER3602:
					case CONTROLLER3603:
						controls.Up = gamepad.buttons[3].pressed;
						controls.Left = gamepad.buttons[2].pressed;
						controls.Down = gamepad.buttons[0].pressed;
						controls.Right = gamepad.buttons[1].pressed;
						controls.Start = gamepad.buttons[7].pressed;
						controls.Back = gamepad.buttons[6].pressed;
						controls.A = gamepad.buttons[5].pressed;
						controls.B = gamepad.buttons[4].pressed;
						break;
					case CONTROLLERPS4:
						controls.Up = gamepad.buttons[3].pressed || gamepad.axes[1] < -0.3;
						controls.Left = gamepad.buttons[0].pressed || gamepad.axes[0] < -0.3;
						controls.Down = gamepad.buttons[1].pressed || gamepad.axes[1] > 0.3;
						controls.Right = gamepad.buttons[2].pressed || gamepad.axes[0] > 0.3;
						controls.Start = gamepad.buttons[9].pressed;
						controls.Back = gamepad.buttons[8].pressed;
						controls.A = gamepad.buttons[5].pressed;
						controls.B = gamepad.buttons[4].pressed;
						break;
					case CONTROLLERPS3:
						controls.Up = gamepad.buttons[4].pressed || gamepad.axes[1] < -0.3;
						controls.Left = gamepad.buttons[7].pressed || gamepad.axes[0] < -0.3;
						controls.Down = gamepad.buttons[6].pressed || gamepad.axes[1] > 0.3;
						controls.Right = gamepad.buttons[5].pressed || gamepad.axes[0] > 0.3;
						controls.Start = gamepad.buttons[3].pressed;
						controls.Back = gamepad.buttons[0].pressed;
						controls.A = gamepad.buttons[14].pressed;
						controls.B = gamepad.buttons[13].pressed;
						break;
					case CONTROLLERPS2:
						controls.Up = gamepad.buttons[12].pressed || gamepad.buttons[0].pressed || gamepad.axes[1] < -0.3;
						controls.Left = gamepad.buttons[14].pressed || gamepad.buttons[3].pressed || gamepad.axes[0] < -0.3;
						controls.Down = gamepad.buttons[13].pressed || gamepad.buttons[2].pressed || gamepad.axes[1] > 0.3;
						controls.Right = gamepad.buttons[15].pressed || gamepad.buttons[1].pressed || gamepad.axes[0] > 0.3;
						controls.Start = gamepad.buttons[9].pressed;
						controls.Back = gamepad.buttons[8].pressed;
						controls.A = gamepad.buttons[7].pressed || gamepad.buttons[5].pressed
						controls.B = gamepad.buttons[6].pressed || gamepad.buttons[4].pressed;
						break;					
					case CONTROLLERGAMECUBE:
						controls.Up = gamepad.buttons[3].pressed || gamepad.buttons[8].pressed;
						controls.Left = gamepad.buttons[1].pressed || gamepad.buttons[10].pressed;
						controls.Down = gamepad.buttons[0].pressed || gamepad.buttons[9].pressed;
						controls.Right = gamepad.buttons[2].pressed || gamepad.buttons[11].pressed;
						controls.Start = gamepad.buttons[7].pressed;
						controls.Back = gamepad.buttons[6].pressed;
						controls.A = gamepad.buttons[5].pressed;
						controls.B = gamepad.buttons[4].pressed;
						break;	
					case CONTROLLERGAMECUBE2:
						controls.Up = gamepad.buttons[3].pressed || gamepad.buttons[12].pressed;
						controls.Left = gamepad.buttons[2].pressed || gamepad.buttons[15].pressed;
						controls.Down = gamepad.buttons[1].pressed || gamepad.buttons[14].pressed;
						controls.Right = gamepad.buttons[0].pressed || gamepad.buttons[13].pressed;
						controls.Start = gamepad.buttons[9].pressed;
						controls.Back = gamepad.buttons[7].pressed;
						controls.A = gamepad.buttons[5].pressed;
						controls.B = gamepad.buttons[4].pressed;
						break;					
					default:
						controls.Up = gamepad.buttons[12].pressed || gamepad.axes[1] < -0.3;
						controls.Left = gamepad.buttons[14].pressed || gamepad.axes[0] < -0.3;
						controls.Down = gamepad.buttons[13].pressed || gamepad.axes[1] > 0.3;
						controls.Right = gamepad.buttons[15].pressed || gamepad.axes[0] > 0.3;
						controls.Start = gamepad.buttons[9].pressed;
						controls.Back = gamepad.buttons[8].pressed;
						controls.A = gamepad.buttons[0].pressed;
						controls.B = gamepad.buttons[1].pressed;
						break;
				}
				controls.exists = true;

			} catch (err) {
				console.log(`${err}: Controller ${gamepad.index} ${gamepad.id} Unsupported :(`);
			}
		}
	}
	return controls;
};

// ----------------------------------------------------------------------------------------------------------------------
//  Movement & Collision
// ----------------------------------------------------------------------------------------------------------------------

function activateBoost(cycle) {
	if (OPTIONS.BOOST && cycle.boostcharge) {

		boostSound.playSoundEffect();
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

function movement(cycle) {

	// Erase previous drawing
	cycleCtx.clearRect(cycle.x - cycle.xLength/2, cycle.y - cycle.yLength/2, cycle.xLength, cycle.yLength);
	
	// Get relevant controls
	const keyboard = cycle.controls;
	const gamepad = getGamepad(cycle.id);

	// Assume CPU
	if (cycle.id !== 0 && cycle.cpu) {
		let collision = true;
		let moveChance = cycle.cpuMoveTendency;
		while (collision) {
			randomMove = Math.random();
			if (moveChance * 0 < randomMove && randomMove < moveChance * 0 + moveChance) {
				gamepad.Up = true;
			} else if (moveChance * 1 < randomMove && randomMove < moveChance * 1 + moveChance) {
				gamepad.Down = true;
			} else if (moveChance * 2  < randomMove && randomMove < moveChance * 2 + moveChance) {
				gamepad.Left = true;
			} else if (moveChance * 3  < randomMove && randomMove < moveChance * 3 + moveChance) {
				gamepad.Right = true;
			}
			collision = fakeMovement(cycle, gamepad);
			if (collision) {
				if (Math.random() > 0.98) {
					collision = false; //overturn collision avoidance
				} else {
					moveChance = 0.25;
					gamepad.Up = false; gamepad.Down = false; gamepad.Left = false; gamepad.Right = false;
					// Redo
				}
			}
		}
	}
	
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

	// Update location
	switch (cycle.direction) {
		case DIR.UP:
			cycle.x = cycle.x;
			cycle.y = cycle.y - cycle.speed * cycle.boost;
			break;
		case DIR.LEFT:
			cycle.x = cycle.x - cycle.speed * cycle.boost;
			cycle.y = cycle.y;
			break;
		case DIR.DOWN:
			cycle.x = cycle.x;
			cycle.y = cycle.y + cycle.speed * cycle.boost;
			break;
		case DIR.RIGHT:
			cycle.x = cycle.x + cycle.speed * cycle.boost;
			cycle.y = cycle.y;
			break;
		default:
			cycle.x = cycle.x;
			cycle.y = cycle.y;
	}

	// Need to update hitbox coordinates with movement
	cycle.setHitbox(cycle.direction, cycle.orientation);
};

function fakeMovement(cycle, gamepad) {
	let initialDirection = cycle.direction;
	let initialOrientation = cycle.orientation;
	let initialx = cycle.x;
	let initialy = cycle.y;

	if (gamepad.Up === true) {
		if (cycle.direction !== DIR.DOWN) { 
			cycle.direction = DIR.UP;
			cycle.orientation = ORI.VERTICAL;
		}
	} else if (gamepad.Left === true) {
		if (cycle.direction !== DIR.RIGHT) {
			cycle.direction = DIR.LEFT;
			cycle.orientation = ORI.HORIZONTAL;
		}
	} else if (gamepad.Down === true) {
		if (cycle.direction !== DIR.UP) { 
			cycle.direction = DIR.DOWN;
			cycle.orientation = ORI.VERTICAL;
		}
	} else if (gamepad.Right === true) {
		if (cycle.direction !== DIR.LEFT) {	
			cycle.direction = DIR.RIGHT;
			cycle.orientation = ORI.HORIZONTAL;
		}
	}

	// Update location
	switch (cycle.direction) {
		case DIR.UP:
			cycle.x = cycle.x;
			cycle.y = cycle.y - cycle.speed * cycle.boost;
			break;
		case DIR.LEFT:
			cycle.x = cycle.x - cycle.speed * cycle.boost;
			cycle.y = cycle.y;
			break;
		case DIR.DOWN:
			cycle.x = cycle.x;
			cycle.y = cycle.y + cycle.speed * cycle.boost;
			break;
		case DIR.RIGHT:
			cycle.x = cycle.x + cycle.speed * cycle.boost;
			cycle.y = cycle.y;
			break;
		default:
			cycle.x = cycle.x;
			cycle.y = cycle.y;
	}

	// Need to update hitbox coordinates with movement
	cycle.setHitbox(cycle.direction, cycle.orientation);

	let collision = collisionCheck(cycle, true)

	cycle.direction = initialDirection;
	cycle.orientation = initialOrientation;
	cycle.x = initialx;
	cycle.y = initialy;

	return collision;
}

function drawTrail(cycle) {
	switch (cycle.direction) {
		case DIR.UP:
			trailCtx.drawImage(
				cycle.image, //image
				cycle.x - PROPERTIES.TRAILWIDTH/2, //x
				cycle.y, //y
				PROPERTIES.TRAILWIDTH, //xLength
				cycle.speed * cycle.boost); //yLength
			break;
		case DIR.LEFT:
			trailCtx.drawImage(
				cycle.image,
				cycle.x,
				cycle.y - PROPERTIES.TRAILWIDTH/2,
				cycle.speed * cycle.boost,
				PROPERTIES.TRAILWIDTH);
			break;
		case DIR.DOWN:
			trailCtx.drawImage(
				cycle.image,
				cycle.x - PROPERTIES.TRAILWIDTH/2,
				cycle.y - cycle.speed * cycle.boost,
				PROPERTIES.TRAILWIDTH,
				cycle.speed * cycle.boost);
			break;
		case DIR.RIGHT:
			trailCtx.drawImage(
				cycle.image,
				cycle.x - cycle.speed * cycle.boost,
				cycle.y - PROPERTIES.TRAILWIDTH/2,
				cycle.speed * cycle.boost,
				PROPERTIES.TRAILWIDTH);
			break;
	}	
}

function collisionCheck(cycle, fake = false) {
	let collision = false;

	// Check Boundary Collision
	if (cycle.xhb < 0 || cycle.yhb < 0 || cycle.xhb + cycle.xhbLength >= cycleCanvas.width || cycle.yhb + cycle.yhbLength >= cycleCanvas.height) {
		if (!fake) killCycle(cycle);
		return true;
	}

	// Check Cycle Collision First
	cycles.forEach(function(othercycle) {
		if (othercycle.alive === true) {
			if (othercycle.id !== cycle.id) {
				const cyclexhbEdge = cycle.xhb + cycle.xhbLength;
				const cycleyhbEdge = cycle.yhb + cycle.yhbLength;
				const otherxhbEdge = othercycle.xhb + othercycle.xhbLength;
				const otheryhbEdge = othercycle.yhb + othercycle.yhbLength;

				// Massively redundant and inaccurate check for if hitboxes pass exactly past each other in a frame
				// This might overreach collision in very rare alternate cases?
				if (cycle.orientation === othercycle.orientation) {
					if (cycle.orientation === ORI.VERTICAL) {
						if (cycle.xhb < otherxhbEdge
						&& othercycle.xhb < cyclexhbEdge
						&& cycle.yhb <= otheryhbEdge
						&& othercycle.yhb <= cycleyhbEdge) {
							if (!fake) {
								killCycle(cycle);
								killCycle(othercycle);
							}
							collision = true;
							return true;
						}
					} else {
						if (cycle.xhb <= otherxhbEdge
						&& othercycle.xhb <= cyclexhbEdge
						&& cycle.yhb < otheryhbEdge
						&& othercycle.yhb < cycleyhbEdge) {
							if (!fake) {
								killCycle(cycle);
								killCycle(othercycle);
							}
							collision = true;
							return true;
						}
					}
				}

				if (cycle.xhb < otherxhbEdge
				&& othercycle.xhb < cyclexhbEdge
				&& cycle.yhb < otheryhbEdge
				&& othercycle.yhb < cycleyhbEdge) {
					if (!fake) {
						killCycle(cycle);
						killCycle(othercycle);
					}
					collision = true;
					return true;
				}
			} 
		}
	});
	
	if (checkTrailCollision(cycle, fake)) collision = true;
	return collision;
};

function checkTrailCollision(cycle, fake = false) {
	let collision = false;

	cycles.forEach(function(othercycle) {
		if (othercycle.alive === true) {
			othercycle.turns.forEach((turn, index) => {
				let nextTurn;
				if (othercycle.turns[index + 1] !== undefined) {
					nextTurn = othercycle.turns[index + 1]; 
				} else {
					if (othercycle.id === cycle.id) { // don't collide with own last drawn part of trail
						switch (cycle.direction) {
							case DIR.RIGHT:	nextTurn = [cycle.xhb - 1, cycle.y]; break;
							case DIR.LEFT: nextTurn = [cycle.x + cycle.xhbLength - PROPERTIES.CYCLELENGTH / 4 + 1, cycle.y]; break;
							case DIR.UP: nextTurn = [cycle.x, cycle.y + cycle.yhbLength - PROPERTIES.CYCLELENGTH / 4 + 1]; break;
							case DIR.DOWN: nextTurn = [cycle.x, cycle.yhb - 1]; break;
						}
					} else {
						nextTurn = [othercycle.x, othercycle.y];
					}
				}

				const cyclexhbEdge = cycle.xhb + cycle.xhbLength;
				const cycleyhbEdge = cycle.yhb + cycle.yhbLength;
				let trailxStart;
				let trailyStart;
				let trailxEdge;
				let trailyEdge;

				if (nextTurn[0] === turn[0]) { // y movement
					trailxStart = turn[0] - PROPERTIES.TRAILWIDTH / 2;
					trailxEdge = turn[0] + PROPERTIES.TRAILWIDTH / 2;
					trailyStart = Math.min(turn[1], nextTurn[1]);
					trailyEdge = Math.max(turn[1], nextTurn[1]);
				} else { // x movement
					trailxStart = Math.min(turn[0], nextTurn[0])
					trailxEdge = Math.max(turn[0], nextTurn[0])
					trailyStart = turn[1] - PROPERTIES.TRAILWIDTH / 2;
					trailyEdge = turn[1] + PROPERTIES.TRAILWIDTH / 2;
				}

				if (cycle.xhb < trailxEdge
				&& trailxStart < cyclexhbEdge
				&& cycle.yhb < trailyEdge
				&& trailyStart < cycleyhbEdge) {
					if (!fake) killCycle(cycle);
					collision = true;
					return true;
				}
			});
		}
	});
	return collision;
}

function checkWinner() {
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
			championSound.playSoundEffect();
			showInputMessage(`Player ${cycle.id + 1} WINS!!`, "A to Rematch, B to Menu", cycle.id);
		} else {
			winnerSound.playSoundEffect();
			showTimeoutMessage(`Player ${cycle.id + 1}!`, `${SCORES[cycle.id]} of ${OPTIONS.WINS}!`, cycle.id);
		}
		TITLEPOSITIONY = 0;
		gameMusic.playbackRate = 1;
		RESTART = true;
		return;
	} else if (livingCycles.length === 0) {
		drawSound.playSoundEffect();
		TITLEPOSITIONY = 0;
		gameMusic.playbackRate = 1;
		showTimeoutMessage(MESSAGEDRAW, "", -1);
		RESTART = true;
		return;
	}
}

function killCycle(cycle) {
	deathSound.playSoundEffect();
	if (OPTIONS.PLAYERCOUNT !== 2) gameMusic.playbackRate += 0.5 / (OPTIONS.PLAYERCOUNT - 2);
	cycle.alive = false;
	eraseCycle(cycle);
	cycle.turns.push([cycle.x, cycle.y]);  // End Point
	eraseTrail(cycle);
};

function eraseTrail(cycle) {
	// Traces turns and erases just player's lines
	const turns = cycle.turns;
	for (let i = 1; i < turns.length; i += 1) {
		if (turns[i-1][0] !== turns[i][0]) { //Horizontal Trail
			trailCtx.clearRect(Math.min(turns[i-1][0], turns[i][0]), turns[i][1] - PROPERTIES.TRAILWIDTH/2, Math.abs(turns[i-1][0] - turns[i][0]), PROPERTIES.TRAILWIDTH); //Erase Old Pixels
		} else { //Vertical Trail
			trailCtx.clearRect(turns[i][0] - PROPERTIES.TRAILWIDTH/2, Math.min(turns[i-1][1], turns[i][1]), PROPERTIES.TRAILWIDTH, Math.abs(turns[i-1][1] - turns[i][1])); //Erase Old Pixels
		}
	}
};

function eraseCycle(cycle) {
	let alt = (cycle.id === MAXPLAYERCOUNT - 1) ? OPTIONS.THEME.TAG : "";
	const deathAnimation = loader.images["cycleDie" + cycle.id + alt];
	let i = 1;
	const animationFrames = 6;
	const drawDeath = setInterval(function() {
		cycleCtx.clearRect(cycle.x - cycle.xLength/2, cycle.y - cycle.yLength/2, cycle.xLength, cycle.yLength);
		cycleCtx.drawImage(deathAnimation, (i % 2) * 20, (Math.floor(i/2) % 3) * 20, cycle.xLength, cycle.yLength, cycle.x - cycle.xLength/2, cycle.y - cycle.yLength/2, cycle.xLength, cycle.yLength);
		i += 1;
		if (i === animationFrames) clearInterval(drawDeath);
	}, 100);
}

function triggerDisappearTrail() {
	DISAPPEAR.started = false;
	clearTimeout(DISAPPEAR.timeout);
	DISAPPEAR.timeout = setTimeout(function() {
		DISAPPEAR.started = true;
	}, PROPERTIES.DISAPPEARTIME);
}

// This is ugly stuff
function disappearTrail(cycle) {
	const turns = cycle.turns;

	if (turns.length > 1) {
		if (turns[0][0] < turns[1][0]) { // Right
			trailCtx.clearRect(turns[0][0], turns[0][1] - PROPERTIES.TRAILWIDTH/2, cycle.speed * cycle.boost, PROPERTIES.TRAILWIDTH); //Erase Old Pixels
			cycle.turns[0][0] = turns[0][0] + cycle.speed * cycle.boost;
			if (turns[0][0] === turns[1][0] && turns[0][1] === turns[1][1]) {
				turns.shift();
				trailCtx.clearRect(turns[0][0], turns[0][1] - PROPERTIES.TRAILWIDTH/2, cycle.speed * cycle.boost, PROPERTIES.TRAILWIDTH); //Erase Old Pixels
			}
		} else if (turns[0][0] > turns[1][0]) { // Left
			trailCtx.clearRect(turns[0][0] - cycle.speed * cycle.boost, turns[0][1] - PROPERTIES.TRAILWIDTH/2, cycle.speed * cycle.boost, PROPERTIES.TRAILWIDTH); //Erase Old Pixels
			cycle.turns[0][0] = turns[0][0] - cycle.speed * cycle.boost;
			if (turns[0][0] === turns[1][0] && turns[0][1] === turns[1][1]) {
				turns.shift();
				trailCtx.clearRect(turns[0][0] - cycle.speed * cycle.boost, turns[0][1] - PROPERTIES.TRAILWIDTH/2, cycle.speed * cycle.boost, PROPERTIES.TRAILWIDTH); //Erase Old Pixels
			}
		// Something's weirdly backwards about these two compared to Left/Right and turns.length === 1
		} else if (turns[0][1] < turns[1][1]) { // Up
			cycle.turns[0][1] = turns[0][1] + cycle.speed * cycle.boost;
			trailCtx.clearRect(turns[0][0] - PROPERTIES.TRAILWIDTH/2, turns[0][1] - cycle.speed * cycle.boost, PROPERTIES.TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			if (turns[0][0] === turns[1][0] && turns[0][1] === turns[1][1]) {
				turns.shift();
				trailCtx.clearRect(turns[0][0] - PROPERTIES.TRAILWIDTH/2, turns[0][1] - cycle.speed * cycle.boost, PROPERTIES.TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			}
		} else if (turns[0][1] > turns[1][1]) { // Down
			cycle.turns[0][1] = turns[0][1] - cycle.speed * cycle.boost;
			trailCtx.clearRect(turns[0][0] - PROPERTIES.TRAILWIDTH/2, turns[0][1], PROPERTIES.TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			if (turns[0][0] === turns[1][0] && turns[0][1] === turns[1][1]) {
				turns.shift();
				trailCtx.clearRect(turns[0][0] - PROPERTIES.TRAILWIDTH/2, turns[0][1], PROPERTIES.TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			}
		}
	} else {
		if (cycle.direction === DIR.RIGHT) { // Right
			trailCtx.clearRect(turns[0][0], turns[0][1] - PROPERTIES.TRAILWIDTH/2, cycle.speed * cycle.boost, PROPERTIES.TRAILWIDTH); //Erase Old Pixels
			cycle.turns[0][0] = turns[0][0] + cycle.speed * cycle.boost;
		} else if (cycle.direction === DIR.LEFT) { // Left
			trailCtx.clearRect(turns[0][0] - cycle.speed * cycle.boost, turns[0][1] - PROPERTIES.TRAILWIDTH/2, cycle.speed * cycle.boost, PROPERTIES.TRAILWIDTH); //Erase Old Pixels
			cycle.turns[0][0] = turns[0][0] - cycle.speed * cycle.boost;
		} else if (cycle.direction === DIR.UP) { // Up
			trailCtx.clearRect(turns[0][0] - PROPERTIES.TRAILWIDTH/2, turns[0][1] - cycle.speed * cycle.boost, PROPERTIES.TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			cycle.turns[0][1] = turns[0][1] - cycle.speed * cycle.boost;
		} else if (cycle.direction === DIR.DOWN) { // Down
			trailCtx.clearRect(turns[0][0] - PROPERTIES.TRAILWIDTH/2, turns[0][1], PROPERTIES.TRAILWIDTH, cycle.speed * cycle.boost); //Erase Old Pixels
			cycle.turns[0][1] = turns[0][1] + cycle.speed * cycle.boost;
		}
	}
}

// ----------------------------------------------------------------------------------------------------------------------
// Rendering
// ----------------------------------------------------------------------------------------------------------------------

// Update game objects
function update() {

	cycles.forEach(function(cycle) {
		if (cycle.alive === true) {
			movement(cycle);
			drawTrail(cycle);
		}
	});
	
	// Must do Collision Check after all Movement
	cycles.forEach(function(cycle) {
		if (cycle.alive === true) {
			collisionCheck(cycle);
		}
	});

	if (DISAPPEAR.started) {
		cycles.forEach(function(cycle) {
			if (cycle.alive === true) {
				disappearTrail(cycle);
			}
		});
	}

	checkWinner();
};

// Draw everything
function render() {

	//Cycle display
	cycles.forEach(function(cycle) {
		if (cycle.alive === true) { 
			let colour;
			if (cycle.speed * cycle.boost > cycle.speed) {
				if (cycle.id === MAXPLAYERCOUNT - 1) colour = loader.images["alt"];
				else colour = OPTIONS.THEME.IMAGE;
			} else {
				colour = cycle.image;
			}

			cycleCtx.drawImage(colour, cycle.x - cycle.xLength/2, cycle.y - cycle.yLength/2, cycle.xLength, cycle.yLength);
			if (OPTIONS.BOOST) drawHitbox(cycle);
		}
	});
	
	drawScore();
};

function drawScore() {
	// Score Display // Not sure why repeated
	menuCtx.fillStyle = OPTIONS.THEME.TEXT;
	menuCtx.fillRect(0, SCOREHEIGHT - MENUBORDER, menuCanvas.width, MENUBORDER);
	menuCtx.fillStyle = OPTIONS.THEME.COLOUR;
	menuCtx.fillRect(0, 0, menuCanvas.width, SCOREHEIGHT - MENUBORDER);
	menuCtx.font = `24px ${FONT}`;
	menuCtx.textBaseline = "middle";
	// Logo
	// There's an annoying bug here if you quit from menu when down to 2 cycles, this briefly displays fancy and isn't fixed until round starts
	menuCtx.fillStyle = (TITLEPOSITIONY === 0) ? OPTIONS.THEME.TEXT : CYCLECOLOURS[COLOURJAM];
	menuCtx.textAlign = "left";
	menuCtx.fillTextCustom("LIGHT ANGLES", 10, 25 - TITLEPOSITIONY)
	menuCtx.textAlign = "right";
	menuCtx.fillTextCustom("LIGHT ANGLES", menuCanvas.width - 10, 25 - TITLEPOSITIONY)
	// Score
	menuCtx.textAlign = "center";
	cycles.forEach(function(cycle) {
		menuCtx.fillStyle = cycle.colour;
		menuCtx.fillTextCustom(SCORES[cycle.id], menuCanvas.width / 2 - (OPTIONS.PLAYERCOUNT * 13) + 26 * cycle.id + 15, 25);
	});
}

// ----------------------------------------------------------------------------------------------------------------------
//  Message/Pause Overlays
// ----------------------------------------------------------------------------------------------------------------------

const MESSAGEREADY = "Ready?";
const MESSAGECOUNTDOWN = ["3", "2", "1"];
const MESSAGEWINNER = "Round Winner!";
const MESSAGEDRAW = "Draw!";
const MESSAGECHAMPION = "Champ!"

function showInputMessage(message, message2, id) {
	INPUTMESSAGE = true;

	drawMessage(message, message2, id);
}

function showTimeoutMessage(message, message2, id) {
	MESSAGE = true;

	timeoutFunction = function() {
		MESSAGE = false;
	}

	drawMessage(message, message2, id);

	const timeout = setTimeout(timeoutFunction, 3000);
};

function showCountdown(countdown) {
	MESSAGE = true;
	
	let timer = 0;
	timeoutFunction = function() {
		clearMessage();
		
		if (timer !== countdown.length) {
			countSound.playSoundEffect();
			menuCtx.font = `${24 * (timer + 3)}px ${FONT}`;
			menuCtx.fillTextCustom(countdown[timer], menuCanvas.width/2, menuCanvas.height/2);
		} else {
			MESSAGE = false;
			startAudio(gameMusic);
			clearInterval(timeout);
			menuCtx.clearCanvas(menuCanvas);
			// Ugly: But always needs to trigger after timeout
			if (OPTIONS.DISAPPEARINGTRAILS) triggerDisappearTrail();
		}
		timer += 1;
	}

	// Write Initial Message
	drawMessage(MESSAGEREADY, "", -1)

	const timeout = setInterval(timeoutFunction, 1000);
};

function drawMessage(message, message2, id) {
	if (id !== -1) {
		menuCtx.strokeStyle = cycles[id].colour;
		INPUTTER = id;
	} else {
		menuCtx.strokeStyle = OPTIONS.THEME.TEXT; 
		INPUTTER = 0;
	} 

	let adjust = (message2 ? 8 : 0)

	menuCtx.fillStyle = OPTIONS.THEME.COLOUR;
	menuCtx.lineWidth = MENUBORDER;
	menuCtx.fillRect(menuCanvas.width/2 - 160, menuCanvas.height/2 - 50, 320, 100);
	menuCtx.strokeRect(menuCanvas.width/2 - 160, menuCanvas.height/2 - 50, 320, 100);
	menuCtx.font = `30px ${FONT}`;
	menuCtx.textAlign = "center";
	menuCtx.textBaseline = "middle";
	menuCtx.fillStyle = OPTIONS.THEME.TEXT;
	menuCtx.fillTextCustom(message, menuCanvas.width/2, menuCanvas.height/2 - adjust);

	menuCtx.font = `15px ${FONT}`;
	menuCtx.fillTextCustom(message2, menuCanvas.width/2, menuCanvas.height/2 + 30 - adjust);
}

function clearMessage() {
	// Clear old text
	menuCtx.clearRect(menuCanvas.width/2 - 170, menuCanvas.height/2 - 60, 340, 120);
	// Write Message
	menuCtx.textAlign = "center";
	menuCtx.textBaseline = "middle";
	menuCtx.fillStyle = OPTIONS.THEME.TEXT;
	menuCtx.lineWidth = MENUBORDER;
}

function pause() {
	const pauseOverlay = loader.images["pauseOverlay"];
	// Draw transparent overlay
	menuCtx.globalAlpha = 0.7;
	menuCtx.drawImage(pauseOverlay, 0, 0, menuCanvas.width, menuCanvas.height);
	
	// Write Message
	menuCtx.globalAlpha = 1;
	menuCtx.fillStyle = "#FFFFFF";
	menuCtx.font = `24px ${FONT}`;
	menuCtx.textAlign = "center";
	menuCtx.textBaseline = "middle";
	menuCtx.fillTextCustom("Press Back or [O] to return to Options", menuCanvas.width/2, menuCanvas.height/2);
};

function unpause() {
	menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
};

// ----------------------------------------------------------------------------------------------------------------------
//  Game States
// ----------------------------------------------------------------------------------------------------------------------

function setupState(state) {
	switch (state) {
		case STATE.TITLE: setupTitleState(); break;
		case STATE.OPTION: setupOptionState(); break;
		case STATE.GAME: setupGameState(); break;
	}	
}

function setupTitleState() {
	// //Show Logo
	// const titleImage = loader.images["logo2.svg"];
	// menuCtx.drawImage(titleImage, menuCanvas.width/2 - titleImage.width/2, menuCanvas.height/2 - titleImage.height/2);
}

function doTitleState(gamestate) {
	if (!TITLEMUSICJAMMIN && menuMusic.currentTime > 5.4) TITLEMUSICJAMMIN = true;

	//Show Logo
	menuCtx.clearCanvas(menuCanvas);
	let adjust = (TITLEPOSITIONY === 0) ? "-0" : `-${COLOURJAM}`;
	const titleImage = loader.images[`logo2.svg${adjust}`];
	menuCtx.drawImage(titleImage, menuCanvas.width/2 - titleImage.width/2 - TITLESCALE / 2 - TITLEPOSITIONX, menuCanvas.height/2 - titleImage.height/2 - TITLESCALE / 2 - TITLEPOSITIONY, titleImage.width + TITLESCALE, titleImage.height + TITLESCALE);
	incrementImageScale();

	const gamepad = getGamepad(0);

	if (!BUTTONPRESSED) {
		BUTTONPRESSED = true;
		if (ENTERKEY in keysDown || gamepad.A === true || gamepad.Start === true) {
			// BUTTONPRESSED will be deactivated by Options to prevent pass-through
			selectSound.playSoundEffect();
			menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
			gamestate = STATE.OPTION;
		} else if (gamepad.B === true) {
			// Works with custom FireFox 'about:config' settings: (not recommended if using the browser regularly)
			// dom.allow_scripts_to_close_windows: true
			window.close();
		} else {
			BUTTONPRESSED = false;
		}
	}
	return(gamestate);
};

function incrementImageScale(noBackgroundAnim = false) {
	// noBackgroundAnim = false;
	// if (TITLESCALEUP) {
	// 	TITLESCALE += 2;
	// 	if (TITLESCALE > 30) TITLESCALEUP = false;
	// } else {
	// 	TITLESCALE -= 2;
	// 	if (TITLESCALE < 0) TITLESCALEUP = true;
	// }
	if (TITLEMUSICJAMMIN) {
		if (!noBackgroundAnim) document.getElementById("background").style.opacity -= BACKGROUNDSPEED / 10000;	
		if (TITLEPOSITIONUP) {
			TITLEPOSITIONY += 1.5 * gameMusic.playbackRate;
			// TITLEPOSITIONX += 0.5;
			if (TITLEPOSITIONY > 13) {
				TITLEPOSITIONUP = false;
				COLOURJAM = mod(COLOURJAM + 1, OPTIONS.PLAYERCOUNT);
				if (!noBackgroundAnim) document.getElementById("background").style.opacity = 1;
				if (!noBackgroundAnim) doBackground();
			}
		} else {
			TITLEPOSITIONY -= 0.2 * gameMusic.playbackRate;
			// TITLEPOSITIONX -= 0.5;
			if (TITLEPOSITIONY < 0) {
				TITLEPOSITIONUP = true;
			}
		}
	}
}

function doBackground() {
	if (BACKGROUNDJAMMIN) {
		document.getElementById("background").style.background = OPTIONS.THEME.BACKGROUND;
	} else {
		document.getElementById("background").style.background = OPTIONS.THEME.BACKGROUNDALT;
	}
	BACKGROUNDJAMMIN = !BACKGROUNDJAMMIN;
}

function setupOptionState() {
	if (gameMusic.volume === 1) fadeAudio(gameMusic);
	if (menuMusic.volume === 0) startAudio(menuMusic);

	// Option Text Settings
	menuCtx.font = `24px ${FONT}`;
	menuCtx.textAlign = "center";
	menuCtx.textBaseline = "middle";
}

function doOptionState(gamestate) {
	loopAudio(menuMusic, 208, 7.25);
	if (!TITLEMUSICJAMMIN && menuMusic.currentTime > 5.4) TITLEMUSICJAMMIN = true;

	menuCtx.clearCanvas(menuCanvas);

	// Controller Indicators
	for (let i = 0; i < OPTIONS.PLAYERCOUNT; i++) {
		menuCtx.fillStyle = CYCLECOLOURS[i];
		const gamepad = getGamepad(i);
		if (gamepad.exists && gamepad.A === true) {
			menuCtx.fillRect(menuCanvas.width / 2 - (OPTIONS.PLAYERCOUNT * 20 / 2) + 20 * i, menuCanvas.height/2 - 30 * 5 - 5, 20, 20);
		} else if (gamepad.exists) {
			menuCtx.fillRect(menuCanvas.width / 2 - (OPTIONS.PLAYERCOUNT * 20 / 2) + 20 * i + 5, menuCanvas.height/2 - 30 * 5, 10, 10);
		} else {
			menuCtx.fillStyle = OPTIONS.THEME.TEXT;
			menuCtx.fillRect(menuCanvas.width / 2 - (OPTIONS.PLAYERCOUNT * 20 / 2) + 20 * i + 10, menuCanvas.height/2 - 30 * 5 + 3, 4, 4);			
		}
	}

	// Write Option Text
	// Some of this positioning is weird
	menuCtx.fillStyle = (TITLEPOSITIONY === 0) ? OPTIONS.THEME.TEXTALT : CYCLECOLOURS[COLOURJAM];
	menuCtx.fillTextCustom("Press Start or [Enter] to Begin", menuCanvas.width/2, menuCanvas.height/2 - 30 * 3.5 - TITLEPOSITIONY);
	incrementImageScale();
	menuCtx.fillStyle = OPTIONS.THEME.TEXT;
	
	// Write Option Text with Dynamic Highlight
	const optionmessages = ["Players: " + OPTIONS.PLAYERCOUNT,
				"Wins: " + OPTIONS.WINS,
				"Theme: " + OPTIONS.THEME.NAME,
				"Boost: " + (OPTIONS.BOOST ? "Yes" : "No"),
				"Disappearing Trails: " + (OPTIONS.DISAPPEARINGTRAILS ? "Yes" : "No")];
	for (let i = 0; i < optionmessages.length; i++) {
		// Highlight value is updated by controls
		menuCtx.fillStyle = (i === HIGHLIGHT ? OPTIONS.THEME.TEXTHIGHLIGHT : OPTIONS.THEME.TEXT);
		menuCtx.fillTextCustom(optionmessages[i], menuCanvas.width/2, menuCanvas.height/2 - 30 * (optionmessages.length/2 - i));
	}
	
	// Handle Option Controls
	const keyboard = CYCLEKEYCONTROLS[0];
	const gamepad = getGamepad(0);
	if (!BUTTONPRESSED) {
		BUTTONPRESSED = true;
		// Enter/Start --> Start the Game
		if (ENTERKEY in keysDown || gamepad.Start === true) {
			menuCtx.clearCanvas(menuCanvas);
			gamestate = STATE.GAME;
			selectSound.playSoundEffect();
		// Up --> Move Highlight
		} else if (keyboard[DIR.UP] in keysDown || gamepad.Up === true) {
			logButtons();
			HIGHLIGHT = mod((HIGHLIGHT - 1), Object.keys(OPTIONS).length);
			optionSound.playSoundEffect();
		// Down --> Move Highlight
		} else if (keyboard[DIR.DOWN] in keysDown || gamepad.Down === true) { 
			logButtons();
			HIGHLIGHT = mod((HIGHLIGHT + 1), Object.keys(OPTIONS).length);
			optionSound.playSoundEffect();
		// Left/Right --> Change Option
		} else if ((keyboard[DIR.LEFT] in keysDown || gamepad.Left === true) 
				|| (keyboard[DIR.RIGHT] in keysDown || gamepad.Right === true)) {

			const left = keyboard[DIR.LEFT] in keysDown || gamepad.Left === true;
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
						document.body.style.background = OPTIONS.THEME.COLOUR;
						if (TITLEMUSICJAMMIN) document.getElementById("background").style.background = (BACKGROUNDJAMMIN) ? OPTIONS.THEME.BACKGROUND : OPTIONS.THEME.BACKGROUNDALT;
						CYCLECOLOURS[MAXPLAYERCOUNT - 1] = OPTIONS.THEME.TEXT;
					}
					break;
			}
			option2Sound.playSoundEffect();
		// Special Options: Fullscreen or Reload Game with Controller
		} else if (gamepad.Back === true) {
			// Only works with custom browser config
			toggleFullScreen(document.documentElement);
		} else if (gamepad.B === true) {
			window.location.reload();
		} else {
			BUTTONPRESSED = false;
		}
	} else if (Object.keys(keysDown).length === 0 && gamepad.none()) { 
		BUTTONPRESSED = false;
	}
	return(gamestate);
};

function logButtons() {
	console.log(navigator.getGamepads());
	//Lazy Gamepad Button Map Diagnosing
	try {
		let buttonString = "Gamepad 0: ";
		navigator.getGamepads()[0].buttons.forEach((button, index) => {
			buttonString += `${index} ${button.pressed}, `; 
		});
		console.log(buttonString);
	} catch(err) { }
}

function setupGameState() {
	if (menuMusic.volume === 1) fadeAudio(menuMusic);
}

function doGameState(gamestate) {
	loopAudio(gameMusic, 161, 7.3);

	if (OPTIONS.PLAYERCOUNT !== 2 && cycles.filter((cycle) => { return cycle.alive }).length === 2) {
		TITLEMUSICJAMMIN = true;
		incrementImageScale(true);
	} else {
		document.getElementById("background").style.opacity = 1;
		document.getElementById("background").style.background = OPTIONS.THEME.BACKGROUND;
		TITLEPOSITIONY = 0;
	}

	const gamepad = getGamepad(0);

	// The message display is an awful mess
	if (!BUTTONPRESSED && !MESSAGE && !INPUTMESSAGE) {
		BUTTONPRESSED = true;
		// Pause the Game
		if (ENTERKEY in keysDown || ESCAPEKEY in keysDown || gamepad.Start === true) {
			PAUSE = !PAUSE;
			if (PAUSE) pause(); else unpause();
		// Go back to the Option Screen from Pause
		} else if (PAUSE && (OKEY in keysDown || gamepad.Back === true)) {
			unpause();
			restartGameState();
			gamestate = STATE.OPTION;
			return(gamestate);
		} else {
			BUTTONPRESSED = false;
		}
	
		// ie. Normal Gameplay
		if(!PAUSE) {
			// Reset Cycles if new Round
			if (RESTART) {
				trailCtx.clearCanvas(trailCanvas);
				cycleCtx.clearCanvas(cycleCanvas);
				initializeCycles();

				DISAPPEAR.started = false;
				RESTART = false;

				// Full Restart
				if (SCORES.includes(OPTIONS.WINS)) SCORES = SCORES.map(function(value) { return value = 0; }); 
			
 				showCountdown(MESSAGECOUNTDOWN);
			}
			update();
			render();
		}
	} else if (INPUTMESSAGE) {
		BUTTONPRESSED = true;
		const gamepadWinner = getGamepad(INPUTTER);
		if (ENTERKEY in keysDown || gamepadWinner.A === true || gamepadWinner.Start === true) {
			INPUTMESSAGE = false;
		} else if (OKEY in keysDown || gamepadWinner.B === true) {
			INPUTMESSAGE = false;
			restartGameState();
			gamestate = STATE.OPTION;
			return(gamestate);
		} else {
			BUTTONPRESSED = false;
		}
	} else if (Object.keys(keysDown).length === 0 && gamepad.none()) { 
		BUTTONPRESSED = false;
	}
	return(gamestate);
};

function restartGameState() {
	PAUSE = false;
	RESTART = true;
	SCORES = SCORES.map(function(value) { return value = 0; });
	TITLEPOSITIONY = 0;
	gameMusic.playbackRate = 1;
}

// ----------------------------------------------------------------------------------------------------------------------
//  Load
// ----------------------------------------------------------------------------------------------------------------------

function imageSources() {
	const sources = [];
	for (let i = 0; i < MAXPLAYERCOUNT; i++) {
		sources.push("cycle" + i);
		sources.push("cycleDie" + i);
	}
	sources.push("cycle" + (MAXPLAYERCOUNT - 1) + "alt");
	sources.push("cycleDie" + (MAXPLAYERCOUNT - 1) + "alt");
	sources.push("logo2.svg-0");
	sources.push("logo2.svg-1");
	sources.push("logo2.svg-2");
	sources.push("logo2.svg-3");
	sources.push("logo2.svg-4");
	sources.push("logo2.svg-5");
	sources.push("logo2.svg-6");
	sources.push("logo2.svg-7");
	sources.push("black");
	sources.push("white");
	sources.push("alt");
	sources.push("bgTileBlack2");
	sources.push("bgTileBlack2alt");
	sources.push("bgTileWhite2");	
	sources.push("bgTileWhite2alt");
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
			main(STATE.TITLE, true); 
		}
	}
}

// ----------------------------------------------------------------------------------------------------------------------
//  Stats
// ----------------------------------------------------------------------------------------------------------------------

window.countFPS = (function () {
  var lastLoop = (new Date()).getMilliseconds();
  var count = 1;
  var fps = 0;

  return function () {
	var currentLoop = (new Date()).getMilliseconds();
	if (lastLoop > currentLoop) {
		fps = count;
		count = 1;
	} else {
		count += 1;
	}
	lastLoop = currentLoop;
	return fps;
  };
}());

// ----------------------------------------------------------------------------------------------------------------------
//  Main
// ----------------------------------------------------------------------------------------------------------------------

function main(state, newstate) {

	if (newstate) {
		setupState(state);
	}

	let nextstate;
	switch (state) {
		case STATE.TITLE: nextstate = doTitleState(state); break;
		case STATE.OPTION: nextstate = doOptionState(state); break;
		case STATE.GAME: nextstate = doGameState(state); break;
	}

	newstate = (nextstate !== state ? true : false);

	//console.log(countFPS());

	requestAnimationFrame(function() { main(nextstate, newstate) });
};

// Preloads and holds images, then it calls main
const loader = new Loader(imageSources());
