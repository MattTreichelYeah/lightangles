// Create the canvas'

var menuCanvas = document.createElement("canvas");
menuCanvas.width = window.innerWidth;
menuCanvas.height = window.innerHeight;
var menuCtx = menuCanvas.getContext("2d");
menuCtx.imageSmoothingEnabled = false;

var cycleCanvas = document.createElement("canvas");
cycleCanvas.width = window.innerWidth;
cycleCanvas.height = window.innerHeight;
var cycleCtx = cycleCanvas.getContext("2d");
cycleCtx.imageSmoothingEnabled = false;

var lineCanvas = document.createElement("canvas");
lineCanvas.width = window.innerWidth;
lineCanvas.height = window.innerHeight;
var lineCtx = lineCanvas.getContext("2d");
lineCtx.imageSmoothingEnabled = false;

document.body.appendChild(lineCanvas);
document.body.appendChild(cycleCanvas);
document.body.appendChild(menuCanvas);

// Global Constants
VERTICALSTARTOFFSET = Math.round(cycleCanvas.height/10); //Integer Points on Canvas are more optimized
HORIZONTALSTARTOFFSET = Math.round(cycleCanvas.width/5); //Integer Points on Canvas are more optimized
MAXPLAYERCOUNT = 4;
CYCLELENGTH = 32;
CYCLEWIDTH = 16;
WIDTHMARGIN = Math.abs(CYCLELENGTH - CYCLEWIDTH)/2;
CYCLESPEED = 2;
CYCLEKEYCONTROLS = [[87,65,83,68], //wasd
				[84,70,71,72], //tfgh
				[73,74,75,76], //ijkl
				[38,37,40,39]] //arrows
CYCLESTARTS = [[HORIZONTALSTARTOFFSET,VERTICALSTARTOFFSET],
				[HORIZONTALSTARTOFFSET*4,cycleCanvas.height-VERTICALSTARTOFFSET-CYCLELENGTH],
				[HORIZONTALSTARTOFFSET*3,VERTICALSTARTOFFSET],
				[HORIZONTALSTARTOFFSET*2,cycleCanvas.height-VERTICALSTARTOFFSET-CYCLELENGTH]];
CYCLECOLOURS = ["rgba(255,0,0,255)", //red
				"rgba(0,0,255,255)", //blue
				"rgba(0,255,0,255)", //green
				"rgba(255,255,0,255)"]; //yellow
TRAILWIDTH = 4;

SCORES = [0,0,0,0];

OPTIONS = {PLAYERCOUNT : 4,
				WINS : 4,
				BACKGROUND : "Black",
				BOOST : false,
				DISAPPEARINGTRAILS : false}
TEXT = "White";
HIGHLIGHT = 0;
				
PAUSE = false; //TEMPORARY - NOT GOOD TO EDIT
RESTART = true;
SHOWMESSAGE = false;
BUTTONWAIT = false;

var cycles = []; //Global, used everywhere - should fix
var keysDown = {}; //Global, used everywhere - should fix

//Enumerations //Should Make Enum Objects
UP = 0;
LEFT = 1;
DOWN = 2;
RIGHT = 3;

HORIZONTAL = 0;
VERTICAL = 1;

TITLE = 0;
OPTION = 1;
GAME = 2;

// Sounds
var deathSound = new Audio("snd/soundDeath.wav");

// Game objects
function cycle(id, cyclex, cycley, cyclecolour, cyclecontrols, startdirection) { 
	this.id = id;
	this.x = cyclex;
	this.y = cycley;
	this.speed = CYCLESPEED;
	this.controls = cyclecontrols;
	this.direction = startdirection; //0 Up, 1 Left, 2 Down, 3 Right
	this.prevdirection = startdirection;
	this.colour = cyclecolour;
	this.orientation = (startdirection == LEFT || startdirection == RIGHT ? HORIZONTAL : VERTICAL); //0 if Horizontal, 1 if Vertical
	this.alive = true;
	this.turns = [[cyclex+CYCLELENGTH/2,cycley+CYCLELENGTH/2]]; //Start Point
	this.image = new Image();
	this.image.src = (startdirection == LEFT || startdirection == RIGHT ? "img/cycle" + id + "h.png" : "img/cycle" + id + "v.png");
	this.trail = new Image(); //Use pixel image for trail because lines have annoying anti-aliasing
	this.trail.src = "img/trail" + id + ".png"; 
	
	this.setHitbox = function (direction, orientation) { //Hitbox at mid-front interior, width/length = TRAILWIDTH/CYCLESPEED
		if (direction == RIGHT) {
			var hitboxX = this.x+CYCLELENGTH-CYCLESPEED; 
			var hitboxY = this.y+CYCLELENGTH/2-TRAILWIDTH/2;
			var hitboxLength = CYCLESPEED;
			var hitboxWidth = TRAILWIDTH;
		} else if (direction == LEFT) {
			var hitboxX = this.x; 
			var hitboxY = this.y+CYCLELENGTH/2-TRAILWIDTH/2;
			var hitboxLength = CYCLESPEED;
			var hitboxWidth = TRAILWIDTH;
		} else if (direction == UP) {
			var hitboxX = this.x+CYCLELENGTH/2-TRAILWIDTH/2; 
			var hitboxY = this.y;
			var hitboxLength = TRAILWIDTH;
			var hitboxWidth = CYCLESPEED;
		} else if (direction == DOWN) {
			var hitboxX = this.x+CYCLELENGTH/2-TRAILWIDTH/2; 
			var hitboxY = this.y+CYCLELENGTH-CYCLESPEED;
			var hitboxLength = TRAILWIDTH;
			var hitboxWidth = CYCLESPEED;
		}
		this.hitboxX = hitboxX;
		this.hitboxY = hitboxY;
		this.hitboxLength = hitboxLength;
		this.hitboxWidth = hitboxWidth;
		//lineCtx.fillStyle = "black"; //To View Hitbox
		//if (orientation == HORIZONTAL) cycleCtx.fillRect(hitboxX,hitboxY,CYCLESPEED,TRAILWIDTH);
		//else if (orientation == VERTICAL) cycleCtx.fillRect(hitboxX,hitboxY,TRAILWIDTH,CYCLESPEED);
	}
}

var initializeCycles = function() {
	cycles = [];
	for(var i=0; i<OPTIONS.PLAYERCOUNT; i+=1) {
		var startdirection = (i % 2 == 0 ? DOWN : UP); //Choice to alternate Left/Right, could change
		cycles.push(new cycle(i, CYCLESTARTS[i][0],CYCLESTARTS[i][1],CYCLECOLOURS[i],CYCLEKEYCONTROLS[i],startdirection));
		cycles[i].setHitbox(startdirection, VERTICAL);
	}
};
	
// Handle keyboard controls
addEventListener("keydown", function (e) {
	keysDown[e.keyCode] = true;
}, false);
addEventListener("keyup", function (e) {
	delete keysDown[e.keyCode];
}, false);

var getGamepad = function (id) {
	var gamepad = navigator.getGamepads()[id];
	var gamepadControls = {
		Up : false,
		Left : false,
		Down : false,
		Right : false,
		Start : false,
		A : false,
		B : false
	};
	if (gamepad != undefined) {
		gamepadControls.Up = gamepad.buttons[12].pressed || gamepad.axes[1] < -0.3;
		gamepadControls.Left = gamepad.buttons[14].pressed || gamepad.axes[0] < -0.3;
		gamepadControls.Down = gamepad.buttons[13].pressed || gamepad.axes[1] > 0.3;
		gamepadControls.Right = gamepad.buttons[15].pressed || gamepad.axes[0] > 0.3;
		gamepadControls.Start = gamepad.buttons[9].pressed;
		gamepadControls.A = gamepad.buttons[0].pressed;
		gamepadControls.B = gamepad.buttons[1].pressed;
	}
	return gamepadControls;
};

var movement = function(cycle) {
	switch(cycle.orientation){
		case VERTICAL:
			cycleCtx.clearRect(cycle.x+WIDTHMARGIN,cycle.y,CYCLEWIDTH,CYCLELENGTH); //Erase Old
			break;
		case HORIZONTAL:
			cycleCtx.clearRect(cycle.x,cycle.y+WIDTHMARGIN,CYCLELENGTH,CYCLEWIDTH); //Erase Old
			break;
	}
	
	var cycleControls = cycle.controls;
	
	var gamepadControls = getGamepad(cycle.id);
	
	//To speed up, assign cycle.controls to a variable so less access time
	
	if (cycleControls[UP] in keysDown || gamepadControls.Up == true) { //Up
		if (cycle.direction != DOWN) { //Can't turn back
			cycle.direction = UP;
			cycle.orientation = VERTICAL;
			cycle.image.src = "img/cycle" + cycle.id + "v.png";
		}
	} else if (cycleControls[LEFT] in keysDown || gamepadControls.Left == true) { //Left
		if (cycle.direction != RIGHT) { //Can't turn back
			cycle.direction = LEFT;
			cycle.orientation = HORIZONTAL;
			cycle.image.src = "img/cycle" + cycle.id + "h.png";
		}
	} else if (cycleControls[DOWN] in keysDown || gamepadControls.Down == true) { //Down
		if (cycle.direction != UP) { //Can't turn back
			cycle.direction = DOWN;
			cycle.orientation = VERTICAL;
			cycle.image.src = "img/cycle" + cycle.id + "v.png";
		}
	} else if (cycleControls[RIGHT] in keysDown || gamepadControls.Right == true) { //Right
		if (cycle.direction != LEFT) { //Can't turn back	
			cycle.direction = RIGHT;
			cycle.orientation = HORIZONTAL;
			cycle.image.src = "img/cycle" + cycle.id + "h.png";
		}
	}
	
	cycle.setHitbox(cycle.direction, cycle.orientation);
	
	if (cycle.prevdirection != cycle.direction) {
		cycle.turns.push([cycle.x+CYCLELENGTH/2,cycle.y+CYCLELENGTH/2]);
		cycle.prevdirection = cycle.direction;
	}

	switch(cycle.direction) {
		case UP:
			cycle.x = cycle.x;
			cycle.y = cycle.y - CYCLESPEED;
			lineCtx.drawImage(
				cycle.trail, //image
				cycle.x+CYCLELENGTH/2-TRAILWIDTH/2, //x
				cycle.y+CYCLELENGTH/2, //y
				TRAILWIDTH, //length
				CYCLESPEED); //width
			break;
		case LEFT:
			cycle.x = cycle.x - CYCLESPEED;
			cycle.y = cycle.y;
			lineCtx.drawImage(
				cycle.trail,
				cycle.x+CYCLELENGTH/2,
				cycle.y+CYCLELENGTH/2-TRAILWIDTH/2,
				CYCLESPEED,
				TRAILWIDTH);
			break;
		case DOWN:
			cycle.x = cycle.x;
			cycle.y = cycle.y + CYCLESPEED;
			lineCtx.drawImage(
				cycle.trail,
				cycle.x+CYCLELENGTH/2-TRAILWIDTH/2,
				cycle.y+CYCLELENGTH/2-CYCLESPEED,
				TRAILWIDTH,
				CYCLESPEED);
			break;
		case RIGHT:
			cycle.x = cycle.x + CYCLESPEED;
			cycle.y = cycle.y;
			lineCtx.drawImage(
				cycle.trail,
				cycle.x+CYCLELENGTH/2-CYCLESPEED,
				cycle.y+CYCLELENGTH/2-TRAILWIDTH/2,
				CYCLESPEED,
				TRAILWIDTH);
			break;
		default:
			cycle.x = cycle.x;
			cycle.y = cycle.y;
	}
};

var collisionCheck = function(cycle) {
	//Image Data is RGBαRGBαRGBα... of each pixel in selection
	//Hitbox is trailwidth x cyclespeed at the very front (protruding or intruding?) of the cycle, only running into something will crash
	//Note that getImageData() & files written to cycleCanvas create a security issue, so game must be run on a server or annoying options set to allow images
	//ISSUE: hitbox is TRAILWIDTH x CYCLESPEED = since x/y jump CYCLESPEED amount each tick, need to check all within range - if faster than CYCLELENGTH/2 this would overlap own trail being drawn
	switch(cycle.orientation){
		case VERTICAL:
			if(cycle.x < 0 || cycle.y < 0 || cycle.x+WIDTHMARGIN+CYCLEWIDTH > cycleCanvas.width || cycle.y+CYCLELENGTH > cycleCanvas.height) {
				killCycle(cycle);
			}
			if (cycle.direction == DOWN) {
				var hitbox = lineCtx.getImageData(cycle.x+CYCLELENGTH/2-TRAILWIDTH/2, cycle.y+CYCLELENGTH, TRAILWIDTH, CYCLESPEED).data;
			} else {
				var hitbox = lineCtx.getImageData(cycle.x+CYCLELENGTH/2-TRAILWIDTH/2, cycle.y-1, TRAILWIDTH, CYCLESPEED).data;
			}
			break;
		case HORIZONTAL:
			if(cycle.x < 0 || cycle.y < 0 || cycle.x+CYCLELENGTH > cycleCanvas.width || cycle.y+WIDTHMARGIN+CYCLEWIDTH > cycleCanvas.height) {
				killCycle(cycle);
			}
			if (cycle.direction == RIGHT) {
				var hitbox = lineCtx.getImageData(cycle.x+CYCLELENGTH, cycle.y+CYCLELENGTH/2-TRAILWIDTH/2, CYCLESPEED, TRAILWIDTH).data;
			} else {
				var hitbox = lineCtx.getImageData(cycle.x-1, cycle.y+CYCLELENGTH/2-TRAILWIDTH/2, CYCLESPEED, TRAILWIDTH).data;
			}
			break;
	}
	
	//Check Cycle Collision First: Ugly
	var deadcount = 0;
	cycles.forEach(function(othercycle) {
		if (othercycle.id != cycle.id && othercycle.alive == true) {
			if (cycle.hitboxX <= (othercycle.hitboxX + othercycle.hitboxWidth) 
			&& othercycle.hitboxX <= (cycle.hitboxX + cycle.hitboxWidth) 
			&& cycle.hitboxY <= (othercycle.hitboxY + othercycle.hitboxLength) 
			&& othercycle.hitboxY <= (cycle.hitboxY + cycle.hitboxLength)) {
				killCycle(cycle);
				killCycle(othercycle);
			}
		} else if (othercycle.id != cycle.id && othercycle.alive == false) {
			deadcount += 1;
			if (deadcount == cycles.length-1) {
				SCORES[cycle.id] += 1;  //People who die on boundary at same time go to last player point...
				if (SCORES[cycle.id] == OPTIONS.WINS) {
					showMessage("Champion! Restarting...", cycle.colour);
					SCORES = [0,0,0,0];
				} else {
					showMessage("Winner! Get Ready...", cycle.colour);
				}
				RESTART = true;
				return;
			}
		}
	});
	
	//Check Trail Collision
	for (var i=0; i<hitbox.length; i+=4) {
		pixelcolour = "rgba(" + hitbox[i] + "," + hitbox[i+1] + "," + hitbox[i+2] + "," + hitbox[i+3] + ")";
		if (pixelcolour != "rgba(0,0,0,0)") { //rgba(0,0,0,0) is transparent black, ie. default background
			killCycle(cycle);
			return; //break;?
		}
	}
};

var killCycle = function(cycle) {
	deathSound.load();
	deathSound.play();
	cycle.alive = false;
	cycle.turns.push([cycle.x+CYCLELENGTH/2,cycle.y+CYCLELENGTH/2]);  //End Point
	erasePlayer(cycle);
};

var erasePlayer = function(cycle) {
	var turns = cycle.turns;
	for (var i=1; i<turns.length; i+=1) {
		if (turns[i-1][0] != turns[i][0]) { //Horizontal Trail
			lineCtx.clearRect(Math.min(turns[i-1][0],turns[i][0]),turns[i][1]-TRAILWIDTH/2,Math.abs(turns[i-1][0]-turns[i][0]),TRAILWIDTH); //Erase Old Pixels
		} else { //Vertical Trail
			lineCtx.clearRect(turns[i][0]-TRAILWIDTH/2,Math.min(turns[i-1][1],turns[i][1]),TRAILWIDTH,Math.abs(turns[i-1][1]-turns[i][1])); //Erase Old Pixels
		}
	}
};

// Update game objects
var update = function () {

	cycles.forEach(function(cycle) {
		if (cycle.alive == true) {
			movement(cycle);
		}
	});
	
	cycles.forEach(function(cycle) {
		if (cycle.alive == true) {
			collisionCheck(cycle);
		}
	});
	
};

// Draw everything
var render = function () {
	
	cycles.forEach(function(cycle) {
		if (cycle.alive == true) { 
			cycleCtx.drawImage(cycle.image, cycle.x, cycle.y);
		}
	});
	
	menuCtx.clearRect(0, 0, 200, menuCanvas.height); //Hard Coded Erase, Getting Desperate
	menuCtx.font = "24px 'Arial Black'";
	
	menuCtx.textAlign = "left";
	menuCtx.textBaseline = "top";
	cycles.forEach(function(cycle) {
		menuCtx.fillStyle = cycle.colour;
		menuCtx.fillText(SCORES[cycle.id], 10, 10+30*cycle.id);
	});
	
};

var showMessage = function (message, colour) {
	SHOWMESSAGE = true;
	menuCtx.fillStyle = TEXT;
	menuCtx.fillRect(menuCanvas.width/2-400/2,menuCanvas.height/2-200/2,400,200);
	menuCtx.font = "24px 'Arial Black'";
	menuCtx.textAlign = "center";
	menuCtx.textBaseline = "middle";
	menuCtx.fillStyle = colour;
	menuCtx.fillText(message, menuCanvas.width/2, menuCanvas.height/2);
	setTimeout(continueRestart,3000);
};

var continueRestart = function () {
	SHOWMESSAGE = false;
	menuCtx.clearRect(menuCanvas.width/2-400/2-2,menuCanvas.height/2-200/2-2,404,204);
};

var pause = function () {
	menuCtx.globalAlpha = 0.8;
	var pauseOverlay = new Image(); //Need onload Event Listener
	pauseOverlay.src = "img/pauseOverlay.png";
	pauseOverlay.addEventListener("load", function() {
		menuCtx.drawImage(pauseOverlay, 0, 0, menuCanvas.width, menuCanvas.height);
		
		menuCtx.fillStyle = "White";
		menuCtx.font = "24px 'Arial Black";
		menuCtx.textAlign = "left";
		menuCtx.textBaseline = "top";
		menuCtx.fillText("B to return to Options", 10, 10);
	}, false);
};

var unpause = function () {
	menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
	menuCtx.globalAlpha = 1.0;
};

var title = function (gamestate) {
	var titleImage = new Image();
	titleImage.src = "img/logo1.png";
	titleImage.addEventListener("load", function() {
		menuCtx.drawImage(titleImage, menuCanvas.width/2-titleImage.width/2, menuCanvas.height/2-titleImage.height/2);
	}, false);
	
	var gamepadControls = getGamepad(0);
	if ((13 in keysDown || gamepadControls.A == true || gamepadControls.Start == true) && BUTTONWAIT == false) { //Enter
		menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
		gamestate = OPTION;
		BUTTONWAIT = true;
	} else if (!(13 in keysDown || gamepadControls.A == true || gamepadControls.Start == true)) { 
		BUTTONWAIT = false;
	}
	return(gamestate);
};

var option = function (gamestate) {
	menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
	menuCtx.font = "24px 'Arial Black'";
	menuCtx.fillStyle = TEXT;
	menuCtx.textAlign = "center";
	menuCtx.textBaseline = "top";
	menuCtx.fillText("A to Start", menuCanvas.width/2, menuCanvas.height/2-30*3.5);
	
	var optionmessages = ["Players: " + OPTIONS.PLAYERCOUNT,
				"Wins: " + OPTIONS.WINS,
				"Background: " + OPTIONS.BACKGROUND,
				"Boost: " + (OPTIONS.BOOST ? "Yes" : "No"),
				"Disappearing Trails: " + (OPTIONS.DISAPPEARINGTRAILS ? "Yes" : "No")];
	
	for(var i=0; i < optionmessages.length; i+=1) {
		menuCtx.fillStyle = (i == HIGHLIGHT ? "red" : TEXT);
		menuCtx.fillText(optionmessages[i], menuCanvas.width/2, menuCanvas.height/2-30*(optionmessages.length/2-i));
	}
	
	var gamepadControls = getGamepad(0);
	if ((13 in keysDown || gamepadControls.A == true || gamepadControls.Start == true) && BUTTONWAIT == false) { //Enter
		menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
		gamestate = GAME;
		BUTTONWAIT = true;
	} else if ((CYCLEKEYCONTROLS[0][0] in keysDown || gamepadControls.Up == true) && BUTTONWAIT == false) { //Temporary use of Player 1 Cycle Controls
		HIGHLIGHT = (HIGHLIGHT==0 ? 0 : HIGHLIGHT-1);
		BUTTONWAIT = true;
	} else if ((CYCLEKEYCONTROLS[0][2] in keysDown || gamepadControls.Up == true) && BUTTONWAIT == false) { //Temporary use of Player 1 Cycle Controls
		HIGHLIGHT = (HIGHLIGHT==optionmessages.length-1 ? optionmessages.length-1 : HIGHLIGHT+1);
		BUTTONWAIT = true;
	} else if ((CYCLEKEYCONTROLS[0][1] in keysDown || gamepadControls.Left == true || CYCLEKEYCONTROLS[0][3] in keysDown || gamepadControls.Right == true) && BUTTONWAIT == false) { //Temporary use of Player 1 Cycle Controls
		var left = CYCLEKEYCONTROLS[0][1] in keysDown || gamepadControls.Left == true;
		var optionValue = Object.keys(OPTIONS)[HIGHLIGHT];
		var optionType = typeof OPTIONS[optionValue];
		switch (optionType) {
			case "number": 
				OPTIONS[optionValue] = (left==true ? OPTIONS[optionValue]-1 : OPTIONS[optionValue]+1);
				if (OPTIONS[optionValue] > MAXPLAYERCOUNT) OPTIONS[optionValue] = MAXPLAYERCOUNT;
				else if (OPTIONS[optionValue] < 2) OPTIONS[optionValue] = 2;
				break;
			case "boolean": OPTIONS[optionValue] = !OPTIONS[optionValue]; break;
			case "string": 
				OPTIONS[optionValue] = (OPTIONS[optionValue] == "Black" ? "White" : "Black");
				TEXT = (TEXT == "Black" ? "White" : "Black");
				document.body.style.background = "url('img/bgTile" + OPTIONS[optionValue] + ".png')";
				break;
		}
		BUTTONWAIT = true;
	}  else if (!(13 in keysDown || CYCLEKEYCONTROLS[0][0] in keysDown || CYCLEKEYCONTROLS[0][2] in keysDown || CYCLEKEYCONTROLS[0][1] in keysDown || CYCLEKEYCONTROLS[0][3] in keysDown ||  gamepadControls.A == true || gamepadControls.Start == true ||  gamepadControls.Up == true ||  gamepadControls.Down == true || gamepadControls.Left == true || gamepadControls.Right == true)) { 
		BUTTONWAIT = false;
	}
	return(gamestate);
};

var game = function (gamestate) {
	var gamepadControls = getGamepad(0);
	if ((13 in keysDown || gamepadControls.Start == true) && BUTTONWAIT == false) { //Enter
		PAUSE = !PAUSE;
		BUTTONWAIT = true;
		if (PAUSE == true) pause(); else unpause();
	} else if ((27 in keysDown || gamepadControls.B == true) && BUTTONWAIT == false && PAUSE == true) { //Enter
		unpause();
		PAUSE = false;
		BUTTONWAIT = true;
		gamestate = OPTION;
		SCORES = [0,0,0,0];
		RESTART = true;
		return(gamestate);
	} else if (!((13 in keysDown || 27 in keysDown || gamepadControls.Start == true))) { 
		BUTTONWAIT = false;
	}
	
	if (!PAUSE && !SHOWMESSAGE) {
		if (RESTART) {
			if (SCORES[0] == 0 && SCORES[1] == 0 && SCORES[2] == 0 && SCORES[3] == 0) showMessage("Get Ready...", OPTIONS.BACKGROUND);
			lineCtx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
			cycleCtx.clearRect(0, 0, cycleCanvas.width, cycleCanvas.height);
			initializeCycles();
			RESTART = false;
		}
		update();
		render();
	}
	return(gamestate);
};

var main = function (gamestate) {
	
	switch (gamestate) {
		case TITLE: 
			gamestate = title(gamestate);
			break;
		case OPTION: 
			gamestate = option(gamestate);
			break;
		case GAME: 
			gamestate = game(gamestate);
			break;
	}

	requestAnimationFrame(function() { main(gamestate) });
};

main(TITLE);