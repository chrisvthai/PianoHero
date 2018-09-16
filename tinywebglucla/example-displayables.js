// UCLA's Graphics Example Code (Javascript and C++ translations available), by Garett Ridge for CS174a.
// example-displayables.js - The subclass definitions here each describe different independent animation processes that you want to fire off each frame, by defining a display
// event and how to react to key and mouse input events.  Make one or two of your own subclasses, and fill them in with all your shape drawing calls and any extra key / mouse controls.

// Now go down to Example_Animation's display() function to see where the sample shapes you see drawn are coded, and a good place to begin filling in your own code.
var pianokeys = [  ["c3", "c-3", "d3", "d-3", "e3", "f3", "f-3", "g3", "g-3", "a3", "a-3", "b3", "c4"],
                   ["c4", "c-4", "d4", "d-4", "e4", "f4", "f-4", "g4", "g-4", "a4", "a-4", "b4", "c5"],
                   ["c5", "c-5", "d5", "d-5", "e5", "f5", "f-5", "g5", "g-5", "a5", "a-5", "b5", "c6"] ];
var pianoColor = false;
var keystates = [ [0,0,0,0,0,0,0,0,0,0,0,0,0],
		  [0,0,0,0,0,0,0,0,0,0,0,0,0],
		  [0,0,0,0,0,0,0,0,0,0,0,0,0]
		];
var keycodeArray = [65, 87, 83, 69, 68, 70, 84, 71, 89, 72, 85, 74, 75];
var keybeenplayed = [false, false, false, false, false, false, false, false, false, false, false, false, false];
var audioArray = [];

var octave = 1;
var keycode;
var detection_whitekeys = [0, 2, 4, 5, 7, 9, 11, 12]; //This is for matching the white keys (for collision) with the array keybeenplayed
var accurate = [false, false, false, false, false, false, false, false];
var indication = false;

var currentSongX = [], currentSongY = [];
var songTime = 0;



Declare_Any_Class( "Debug_Screen",  // Debug_Screen - An example of a displayable object that our class Canvas_Manager can manage.  Displays a text user interface.
  { 'construct': function( context )
      { this.define_data_members( { string_map: context.shared_scratchpad.string_map, start_index: 0, tick: 0, visible: false, graphicsState: new Graphics_State() } );
        shapes_in_use.debug_text = new Text_Line( 35 );
      },
    'init_keys': function( controls )
      { //controls.add( "t",    this, function() { this.visible ^= 1;                                                                                                             } );
        controls.add( "up",   this, function() { this.start_index = ( this.start_index + 1 ) % Object.keys( this.string_map ).length;                                           } );
        controls.add( "down", this, function() { this.start_index = ( this.start_index - 1   + Object.keys( this.string_map ).length ) % Object.keys( this.string_map ).length; } );
        this.controls = controls;
      },
    'update_strings': function( debug_screen_object )   // Strings that this displayable object (Debug_Screen) contributes to the UI:
      { debug_screen_object.string_map["tick"]              = "Frame: " + this.tick++;
        debug_screen_object.string_map["text_scroll_index"] = "Text scroll index: " + this.start_index;
      },
    'display': function( time )
      { if( !this.visible ) return;

        shaders_in_use["Default"].activate();
        gl.uniform4fv( g_addrs.shapeColor_loc, Color( .8, .8, .8, 1 ) );

        var font_scale = scale( .02, .04, 1 ),
            model_transform = mult( translation( -.95, -.9, 0 ), font_scale ),
            strings = Object.keys( this.string_map );

        for( var i = 0, idx = this.start_index; i < 4 && i < strings.length; i++, idx = (idx + 1) % strings.length )
        {
          shapes_in_use.debug_text.set_string( this.string_map[ strings[idx] ] );
          shapes_in_use.debug_text.draw( this.graphicsState, model_transform, true, vec4(0,0,0,1) );  // Draw some UI text (strings)
          model_transform = mult( translation( 0, .08, 0 ), model_transform );
        }
        model_transform = mult( translation( .7, .9, 0 ), font_scale );
        shapes_in_use.debug_text.set_string( "Controls:" );
        shapes_in_use.debug_text.draw( this.graphicsState, model_transform, true, vec4(0,0,0,1) );    // Draw some UI text (controls title)

        for( let k of Object.keys( this.controls.all_shortcuts ) )
        {
          model_transform = mult( translation( 0, -0.08, 0 ), model_transform );
          shapes_in_use.debug_text.set_string( k );
          shapes_in_use.debug_text.draw( this.graphicsState, model_transform, true, vec4(0,0,0,1) );  // Draw some UI text (controls)
        }
      }
  }, Animation );

Declare_Any_Class( "Example_Camera",     // An example of a displayable object that our class Canvas_Manager can manage.  Adds both first-person and
  { 'construct': function( context )     // third-person style camera matrix controls to the canvas.
      { // 1st parameter below is our starting camera matrix.  2nd is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.

        context.shared_scratchpad.graphics_state = new Graphics_State( translation(-37, -20,-86), perspective(45, canvas.width/canvas.height, .1, 1000), 0 );

        this.define_data_members( { graphics_state: context.shared_scratchpad.graphics_state, thrust: vec3(), origin: vec3( 0, 5, 0 ), looking: false } );

        // *** Mouse controls: ***
        this.mouse = { "from_center": vec2() };
        var mouse_position = function( e ) { return vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2 ); };   // Measure mouse steering, for rotating the flyaround camera.
         canvas.addEventListener( "mousedown", ( function(self) { return function(e) { e = e || window.event; getRelativeMousePosition(e) }}) (this), false);
        //canvas.addEventListener( "mouseup",   ( function(self) { return function(e) { e = e || window.event;    self.mouse.anchor = undefined;              } } ) (this), false );
        //canvas.addEventListener( "mousedown", ( function(self) { return function(e) { e = e || window.event;    self.mouse.anchor = mouse_position(e);      } } ) (this), false );
        //canvas.addEventListener( "mousemove", ( function(self) { return function(e) { e = e || window.event;    self.mouse.from_center = mouse_position(e); } } ) (this), false );
        //canvas.addEventListener( "mouseout",  ( function(self) { return function(e) { self.mouse.from_center = vec2(); }; } ) (this), false );    // Stop steering if the mouse leaves the canvas.
      },

    'init_keys': function( controls )   // init_keys():  Define any extra keyboard shortcuts here
      {
        //controls.add( ".",     this, function() { this.graphics_state.camera_transform = mult( rotation( 6, 0, 0, -1 ), this.graphics_state.camera_transform ); } );
        //controls.add( "o",     this, function() { this.origin = mult_vec( inverse( this.graphics_state.camera_transform ), vec4(0,0,0,1) ).slice(0,3)         ; } );
        //controls.add( "r",     this, function() { this.graphics_state.camera_transform = mat4()                                                               ; } );
      },
    'update_strings': function( user_interface_string_manager )       // Strings that this displayable object (Animation) contributes to the UI:
      { var C_inv = inverse( this.graphics_state.camera_transform ), pos = mult_vec( C_inv, vec4( 0, 0, 0, 1 ) ),
                                                                  z_axis = mult_vec( C_inv, vec4( 0, 0, 1, 0 ) );
        user_interface_string_manager.string_map["origin" ] = "Center of rotation: " + this.origin[0].toFixed(0) + ", " + this.origin[1].toFixed(0) + ", " + this.origin[2].toFixed(0);
        user_interface_string_manager.string_map["cam_pos"] = "Cam Position: " + pos[0].toFixed(2) + ", " + pos[1].toFixed(2) + ", " + pos[2].toFixed(2);    // The below is affected by left hand rule:
        user_interface_string_manager.string_map["facing" ] = "Facing: "       + ( ( z_axis[0] > 0 ? "West " : "East ") + ( z_axis[1] > 0 ? "Down " : "Up " ) + ( z_axis[2] > 0 ? "North" : "South" ) );
      },
    'display': function( time )
      { /*var leeway = 70,  degrees_per_frame = .0004 * this.graphics_state.animation_delta_time,

                          meters_per_frame  =   .01 * this.graphics_state.animation_delta_time;
        // Third-person camera mode: Is a mouse drag occurring?
        if( this.mouse.anchor )
        {
          var dragging_vector = subtract( this.mouse.from_center, this.mouse.anchor );            // Arcball camera: Spin the scene around the world origin on a user-determined axis.
          if( length( dragging_vector ) > 0 )
            this.graphics_state.camera_transform = mult( this.graphics_state.camera_transform,    // Post-multiply so we rotate the scene instead of the camera.
                mult( translation( this.origin ),
                mult( rotation( .05 * length( dragging_vector ), dragging_vector[1], dragging_vector[0], 0 ),
                      translation(scale_vec( -1, this.origin ) ) ) ) );
        }
        // First-person flyaround mode:  Determine camera rotation movement when the mouse is past a minimum distance (leeway) from the canvas's center.
        var offset_plus  = [ this.mouse.from_center[0] + leeway, this.mouse.from_center[1] + leeway ];
        var offset_minus = [ this.mouse.from_center[0] - leeway, this.mouse.from_center[1] - leeway ];

        for( var i = 0; this.looking && i < 2; i++ )      // Steer according to "mouse_from_center" vector, but don't start increasing until outside a leeway window from the center.
        {
          var velocity = ( ( offset_minus[i] > 0 && offset_minus[i] ) || ( offset_plus[i] < 0 && offset_plus[i] ) ) * degrees_per_frame;  // Use movement's quantity unless the &&'s zero it out
          this.graphics_state.camera_transform = mult( rotation( velocity, i, 1-i, 0 ), this.graphics_state.camera_transform );     // On X step, rotate around Y axis, and vice versa.
        }     // Now apply translation movement of the camera, in the newest local coordinate frame
        this.graphics_state.camera_transform = mult( translation( scale_vec( meters_per_frame, this.thrust ) ), this.graphics_state.camera_transform );
      */}
  }, Animation );

Declare_Any_Class( "Example_Animation",  // An example of a displayable object that our class Canvas_Manager can manage.  This one draws the scene's 3D shapes.
  { 'construct': function( context )
      { this.shared_scratchpad    = context.shared_scratchpad;
      shapes_in_use.noGapKey        = new PKey(1,false,false);                  // At the beginning of our program, instantiate all shapes we plan to use,
      shapes_in_use.piano_black        = new PKey_Black();                    // each with only one instance in the graphics card's memory.
      shapes_in_use.leftGapKey       = new PKey(1,true,false);
      shapes_in_use.rightGapKey        = new PKey(1,false,true);
      shapes_in_use.bothGapKey        = new PKey(1,true,true);
      shapes_in_use.square        = new Square();

      this.song = 0; //used as a timer

      this.green = [];


      if (chosenSong == 1) { // Mary had a little lamb
        currentSongX = [5,4,3,4,5,5,5,4,4,4,5,7,7,5,4,3,4,5,5,5,4,4,5,4,3];
        currentSongY = [];
        for (var i = 0; i < currentSongX.length; i++) {
          currentSongY.push(70+(i*6));
          this.green.push(false);
        }
      }
      else if (chosenSong == 2) { // Ode to joy

        currentSongX = [2,2,3,4,4,3,2,1,0,0,1,2,2,1,1,
                         2,2,3,4,4,3,2,1,0,0,1,2,1,0,0];
        currentSongY = [];
        for (var i = 0; i < currentSongX.length; i++) {
          currentSongY.push(70+(i*6));
          //this.currentSongX[i] += 16;
          this.green.push(false);
        }
      }
      else if (chosenSong == 3) { // Random notes & practice

        for (var i = 0; i < 100; i++) {
          currentSongX.push(getRandomInt());
          currentSongY.push(70+(i*6));
          this.green.push(false);
        }
      } else {
        currentSongX = [];
        currentSongY = [];
      }


        shapes_in_use[ "grandPiano"  ] = new Shape_From_File( "OBJFiles/BabyGrandPiano.obj" );

      },
    'init_keys': function( controls )   // init_keys():  Define any extra keyboard shortcuts here
      {
        controls.add( "ALT+g", this, function() { this.shared_scratchpad.graphics_state.gouraud       ^= 1; } );   // Make the keyboard toggle some
        controls.add( "ALT+n", this, function() { this.shared_scratchpad.graphics_state.color_normals ^= 1; } );   // GPU flags on and off.
        controls.add( "ALT+a", this, function() { this.shared_scratchpad.animate                      ^= 1; } );
        controls.add( "1", this, function() { octave = 0; changeOctave(0);})
        controls.add( "2", this, function() { octave = 1; changeOctave(1);})
        controls.add( "3", this, function() { octave = 2; changeOctave(2);})
        controls.add( "4", this, function() { pianoColor = !pianoColor;})
        controls.add( "a", this, function() { keycode = 65; playNote(0); keystates[octave][ 0] = 1                  ; } );
        controls.add( "w", this, function() { keycode = 87; playNote(1); keystates[octave][ 1] = 1                  ; } );
        controls.add( "s", this, function() { keycode = 83; playNote(2); keystates[octave][ 2] = 1                  ; } );
        controls.add( "e", this, function() { keycode = 69; playNote(3); keystates[octave][ 3] = 1                  ; } );
        controls.add( "d", this, function() { keycode = 68; playNote(4); keystates[octave][ 4] = 1                  ; } );
        controls.add( "f", this, function() { keycode = 70; playNote(5); keystates[octave][ 5] = 1                  ; } );
        controls.add( "t", this, function() { keycode = 84; playNote(6); keystates[octave][ 6] = 1                  ; } );
        controls.add( "g", this, function() { keycode = 71; playNote(7); keystates[octave][ 7] = 1                  ; } );
        controls.add( "y", this, function() { keycode = 89; playNote(8); keystates[octave][ 8] = 1                  ; } );
        controls.add( "h", this, function() { keycode = 72; playNote(9); keystates[octave][ 9] = 1                  ; } );
        controls.add( "u", this, function() { keycode = 85; playNote(10); keystates[octave][10] = 1                  ; } );
        controls.add( "j", this, function() { keycode = 74; playNote(11); keystates[octave][11] = 1                  ; } );
        controls.add( "k", this, function() { keycode = 75; playNote(12); keystates[octave][12] = 1                  ; } );
        controls.add( "a", this, function() { keystates[octave][ 0] = 0; stopNote(0);}, {'type':'keyup'}                                                );
      	controls.add( "w", this, function() { keystates[octave][ 1] = 0; stopNote(1);}, {'type':'keyup'}                                                );
      	controls.add( "s", this, function() { keystates[octave][ 2] = 0; stopNote(2);}, {'type':'keyup'}                                                );
      	controls.add( "e", this, function() { keystates[octave][ 3] = 0; stopNote(3);}, {'type':'keyup'}                                                );
      	controls.add( "d", this, function() { keystates[octave][ 4] = 0; stopNote(4);}, {'type':'keyup'}                                                );
      	controls.add( "f", this, function() { keystates[octave][ 5] = 0; stopNote(5);}, {'type':'keyup'}                                                );
      	controls.add( "t", this, function() { keystates[octave][ 6] = 0; stopNote(6);}, {'type':'keyup'}                                                );
      	controls.add( "g", this, function() { keystates[octave][ 7] = 0; stopNote(7);}, {'type':'keyup'}                                                );
      	controls.add( "y", this, function() { keystates[octave][ 8] = 0; stopNote(8);}, {'type':'keyup'}                                                );
      	controls.add( "h", this, function() { keystates[octave][ 9] = 0; stopNote(9);}, {'type':'keyup'}                                                );
      	controls.add( "u", this, function() { keystates[octave][10] = 0; stopNote(10);}, {'type':'keyup'}                                                );
      	controls.add( "j", this, function() { keystates[octave][11] = 0; stopNote(11);}, {'type':'keyup'}                                                );
      	controls.add( "k", this, function() { keystates[octave][12] = 0; stopNote(12);}, {'type':'keyup'}                                                );

      },
    'update_strings': function( user_interface_string_manager )       // Strings that this displayable object (Animation) contributes to the UI:
      {
        user_interface_string_manager.string_map["time"]    = "Animation Time: " + Math.round( this.shared_scratchpad.graphics_state.animation_time )/1000 + "s";
        user_interface_string_manager.string_map["animate"] = "Animation " + (this.shared_scratchpad.animate ? "on" : "off") ;
      },
    'display': function(time)
      {
        var graphics_state  = this.shared_scratchpad.graphics_state,
            model_transform = mat4();             // We have to reset model_transform every frame, so that as each begins, our basis starts as the identity.
        shaders_in_use["Default"].activate();

        // *** Lights: *** Values of vector or point lights over time.  Arguments to construct a Light(): position or vector (homogeneous coordinates), color, size
        // If you want more than two lights, you're going to need to increase a number in the vertex shader file (index.html).  For some reason this won't work in Firefox.
        graphics_state.lights = [];                    // First clear the light list each frame so we can replace & update lights.
        songTime += .1;
        var t = graphics_state.animation_time/1000, light_orbit = [ Math.cos(t), Math.sin(t) ];
        graphics_state.lights.push( new Light( vec4( 70, 20, 15, 1), Color( 247/255,216/255 , 131/255, 1 ), 30 ) );
        graphics_state.lights.push( new Light( vec4( 20, 20, 16, 1), Color( 247/255,216/255 , 131/255, 1 ), 30 ) );

        // *** Materials: *** Declare new ones as temps when needed; they're just cheap wrappers for some numbers.
        // 1st parameter:  Color (4 floats in RGBA format), 2nd: Ambient light, 3rd: Diffuse reflectivity, 4th: Specular reflectivity, 5th: Smoothness exponent, 6th: Texture image.
        var whitePlastic = new Material( Color( .8,.8,.8,1 ), .4, 40, 45, 40 ), // Omit the final (string) parameter if you want no texture
        greyPlastic = new Material( Color( .2,.2,.2,1 ), .4, 40, 45, 40 ),
        a1 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/A1.png" ),
        s1 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/S1.png" ),
        d1 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/D1.png" ),
        f1 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/F1.png" ),
        g1 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/G1.png" ),
        h1 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/H1.png" ),
        j1 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/J1.png" ),
        k1 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/K1.png" ),

        a2 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/A2.png" ),
        s2 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/S2.png" ),
        d2 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/D2.png" ),
        f2 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/F2.png" ),
        g2 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/G2.png" ),
        h2 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/H2.png" ),
        j2 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/J2.png" ),
        k2 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/K2.png" ),

        a3 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/A3.png" ),
        s3 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/S3.png" ),
        d3 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/D3.png" ),
        f3 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/F3.png" ),
        g3 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/G3.png" ),
        h3 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/H3.png" ),
        j3 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/J3.png" ),
        k3 = new Material( Color( 0,0,0,0 ), 1.0, 0, 0, 1, "KeyImages/K3.png" ),
        red = new Material( Color( 1.0,0,0,1 ), .4, 40, 45, 40 ),
        blue = new Material( Color( 0,0,1.0,1 ), .4, 40, 45, 40 ),
        green = new Material( Color( 0,1.0,0,1 ), .4, 40, 45, 40 ),
        black = new Material( Color( .4,.4,.4,1 ), .4, 40, 45, 40 );

        var keyImageArray = [a1,s1,d1,f1,g1,h1,j1,k1,a2,s2,d2,f2,g2,h2,j2,k2,a3,s3,d3,f3,g3,h3,j3,k3];

        var colorArray = [red, green, blue];

        /**********************************
        Start coding down here!!!!
        **********************************/                                     // From here on down it's just some example shapes drawn for you -- replace them with your own!

	var temp = model_transform;

        for (var i = 0; i < 3; i++) {
            model_transform = mult( model_transform, translation(0, 0, 0 ) );
            temp = model_transform;
	    model_transform = mult (model_transform, rotation(2*keystates[i][0], 1, 0, 0));
      if (i > 0)
            model_transform = mult (model_transform, rotation(2*keystates[i-1][12], 1, 0, 0));
            shapes_in_use.rightGapKey       .draw( graphics_state, model_transform, whitePlastic );
	    model_transform = temp;

            model_transform = mult( model_transform, translation( 3.2, 0, 0 ) );
	    temp = model_transform;
	    model_transform = mult (model_transform, rotation(2*keystates[i][1], 1, 0, 0));
            shapes_in_use.piano_black       .draw( graphics_state, model_transform, greyPlastic );
	    model_transform = temp;

            model_transform = mult( model_transform, translation(0, 0, 0 ) );
	    temp = model_transform;
	    model_transform = mult (model_transform, rotation(2*keystates[i][2], 1, 0, 0));
            shapes_in_use.bothGapKey       .draw( graphics_state, model_transform, whitePlastic );
	    model_transform = temp;

            model_transform = mult( model_transform, translation( 3.2, 0, 0 ) );
	    temp = model_transform;
	    model_transform = mult (model_transform, rotation(2*keystates[i][3], 1, 0, 0));
            shapes_in_use.piano_black       .draw( graphics_state, model_transform, greyPlastic );
	    model_transform = temp;

            model_transform = mult( model_transform, translation( 0, 0, 0 ) );
	    temp = model_transform;
	    model_transform = mult (model_transform, rotation(2*keystates[i][4], 1, 0, 0));
            shapes_in_use.leftGapKey       .draw( graphics_state, model_transform, whitePlastic );
	    model_transform = temp;

            model_transform = mult( model_transform, translation( 3.2, 0, 0 ) );
	    temp = model_transform;
	    model_transform = mult (model_transform, rotation(2*keystates[i][5], 1, 0, 0));
            shapes_in_use.rightGapKey       .draw( graphics_state, model_transform, whitePlastic );
	    model_transform = temp;

            model_transform = mult( model_transform, translation( 3.2, 0, 0 ) );
	    temp = model_transform;
	    model_transform = mult (model_transform, rotation(2*keystates[i][6], 1, 0, 0));
            shapes_in_use.piano_black       .draw( graphics_state, model_transform, greyPlastic );
	    model_transform = temp;

            model_transform = mult( model_transform, translation( 0, 0, 0 ) );
	    temp = model_transform;
	    model_transform = mult (model_transform, rotation(2*keystates[i][7], 1, 0, 0));
            shapes_in_use.bothGapKey       .draw( graphics_state, model_transform, whitePlastic );
	    model_transform = temp;

            model_transform = mult( model_transform, translation( 3.2, 0, 0 ) );
	    temp = model_transform;
	    model_transform = mult (model_transform, rotation(2*keystates[i][8], 1, 0, 0));
            shapes_in_use.piano_black       .draw( graphics_state, model_transform, greyPlastic );
	    model_transform = temp;

            model_transform = mult( model_transform, translation( 0, 0, 0 ) );
	    temp = model_transform;
	    model_transform = mult (model_transform, rotation(2*keystates[i][9], 1, 0, 0));
            shapes_in_use.bothGapKey       .draw( graphics_state, model_transform, whitePlastic );
	    model_transform = temp;

            model_transform = mult( model_transform, translation( 3.2, 0, 0 ) );
	    temp = model_transform;
	    model_transform = mult (model_transform, rotation(2*keystates[i][10], 1, 0, 0));
            shapes_in_use.piano_black       .draw( graphics_state, model_transform, greyPlastic );
	    model_transform = temp;

            model_transform = mult( model_transform, translation( 0, 0, 0 ) );
	    temp = model_transform;
	    model_transform = mult (model_transform, rotation(2*keystates[i][11], 1, 0, 0));
            shapes_in_use.leftGapKey       .draw( graphics_state, model_transform, whitePlastic );
	    model_transform = temp;

            model_transform = mult( model_transform, translation( 3.2, 0, 0 ) );
	    /*temp = model_transform;
	    model_transform = mult (model_transform, rotation(2*keystates[i][12], 1, 0, 0));
            shapes_in_use.rightGapKey       .draw( graphics_state, model_transform, whitePlastic );
	    model_transform = temp;*/
        }

        temp = model_transform;
  	    model_transform = mult (model_transform, rotation(2*keystates[2][12], 1, 0, 0));
              shapes_in_use.rightGapKey       .draw( graphics_state, model_transform, whitePlastic );
  	    model_transform = temp;

        model_transform = mult( model_transform, translation( 3.2, 0, 0 ) );
        shapes_in_use.piano_black       .draw( graphics_state, model_transform, greyPlastic );

        model_transform = mult( model_transform, translation( 0, 0, 0 ) );
        shapes_in_use.leftGapKey       .draw( graphics_state, model_transform, whitePlastic );


      model_transform=mat4();
      model_transform = mult( model_transform, scale( 5,5 , 5) );
        piano = new Material( Color( 0,0,0,1 ), .5, 100, 10, 40, "stars.jpeg");
        model_transform = mult(model_transform, rotation(90,[0,1,0]));
        //model_transform = mult(model_transform, rotation(10,[1,1,0]));
        model_transform = mult(model_transform, scale(9.5,9.5,9.5));
        if (pianoColor) {
          shaders_in_use["Bump_Map"].activate();
          shapes_in_use.grandPiano.draw( graphics_state, mult( model_transform, translation( 1.8,-.5 , .83) ), piano );
        } else {
          shapes_in_use.grandPiano.draw( graphics_state, mult( model_transform, translation( 1.8,-.5 , .83) ), black );
        }

        //Indicator
       /* var temp_indication = false;

        for (var i = 0; i < 7; i++) {
          if (accurate[i]) {
            temp_indication = true;
            break;
          }
        }

        indication = temp_indication;*/

        var model_transform_indicator = mat4();
        model_transform_indicator = mult(model_transform_indicator, translation(35, -12.5, 0));
        /*if (indication)
          shapes_in_use.square.draw( graphics_state, model_transform_indicator, green);
        else shapes_in_use.square.draw( graphics_state, model_transform_indicator, red);*/
        if (chosenSong != 0) {


        for (var i = 0; i < currentSongX.length; i++) {
          model_transform = mat4();
          if (currentSongY[i]-songTime > -10) {
            model_transform = mult( model_transform, translation(3.2*(currentSongX[i]+7*(octave)), currentSongY[i]-songTime, 15.3 ) );

            if (currentSongY[i]-songTime > -0.5)
              shapes_in_use.square       .draw( graphics_state, model_transform, keyImageArray[8*octave+currentSongX[i]] );
            else if (this.green[i])
              shapes_in_use.square       .draw( graphics_state, model_transform, green );
            else shapes_in_use.square       .draw( graphics_state, model_transform, red );

            if (((currentSongY[i]-songTime) < 2) && ((currentSongY[i]-songTime) > -2) && (keybeenplayed[detection_whitekeys[currentSongX[i]]])) { //Detect if square is near the piano keys
                //accurate[this.currentSongX[i]] = true;
                //shapes_in_use.square.draw( graphics_state, model_transform_indicator, green);
                this.green[i] = true; //
            } else {
                //accurate[this.currentSongX[i]] = false;
                //shapes_in_use.square.draw( graphics_state, model_transform_indicator, red);
            }

          }
        }}
      }
}, Animation) ;


  function playNote(keynum) {
    if (!keybeenplayed[keynum]) {
      audioArray[keynum].currentTime = 0.05;
      audioArray[keynum].play();
      keybeenplayed[keynum] = true;
    }
  }

  function stopNote(keynum) {
    setTimeout(function() { audioArray[keynum].pause(); audioArray[keynum].currentTime = 0;}, 50);
    keybeenplayed[keynum] = false;
  }

  function changeOctave(number) { //Anywhere btwn 0-2
    audioArray = [];
    for (var i = 0; i < 13; i++) {
      audioArray.push(document.getElementById(pianokeys[number][i]));
    }

  }

// Generate random key
function getRandomInt(octave) {
  var min = 0, max = 7;
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

Shape.prototype.normalize_positions = function()
  { var average_position = vec3(), average_length = 0;
    for( var i = 0; i < this.positions.length; i++ ) average_position  =  add( average_position, scale_vec( 1/this.positions.length, this.positions[i] ) );
    for( var i = 0; i < this.positions.length; i++ ) this.positions[i] =  subtract( this.positions[i], average_position );
    for( var i = 0; i < this.positions.length; i++ ) average_length    += 1/this.positions.length * length( this.positions[i] );
    for( var i = 0; i < this.positions.length; i++ ) this.positions[i] =  scale_vec( 1/average_length, this.positions[i] );
  }

function checkAccurate() {
  var temp_indication = false;

  for (var i = 0; i < 7; i++) {
    if (accurate[i]) {
      temp_indication = true;
      break;
    }
  }

  indication = temp_indication;
}

function whiteKeyIndex(k){
    var pair = {
	oct:-1,
	key:-1
    };
    switch(k){
    case  0: pair.oct = 0; pair.key = 0; break;
    case  1: pair.oct = 0; pair.key = 2; break;
    case  2: pair.oct = 0; pair.key = 4; break;
    case  3: pair.oct = 0; pair.key = 5; break;
    case  4: pair.oct = 0; pair.key = 7; break;
    case  5: pair.oct = 0; pair.key = 9; break;
    case  6: pair.oct = 0; pair.key =11; break;
    case  7: pair.oct = 0; pair.key =12; break;
    case  8: pair.oct = 1; pair.key = 2; break;
    case  9: pair.oct = 1; pair.key = 4; break;
    case 10: pair.oct = 1; pair.key = 5; break;
    case 11: pair.oct = 1; pair.key = 7; break;
    case 12: pair.oct = 1; pair.key = 9; break;
    case 13: pair.oct = 1; pair.key =11; break;
    case 14: pair.oct = 1; pair.key =12; break;
    case 15: pair.oct = 2; pair.key = 2; break;
    case 16: pair.oct = 2; pair.key = 4; break;
    case 17: pair.oct = 2; pair.key = 5; break;
    case 18: pair.oct = 2; pair.key = 7; break;
    case 19: pair.oct = 2; pair.key = 9; break;
    case 20: pair.oct = 2; pair.key =11; break;
    case 21: pair.oct = 2; pair.key =12; break;
    default: pair.oct =-1; pair.key =-1; break;
    }
    return pair;
}

function getRelativeMousePosition(event, target) {
  target = target || event.target;
  var rect = target.getBoundingClientRect();

  var pt =  {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };

    if ( 495 < pt.y && pt.y < 517 ){ // a white key was pressed
	var key = Math.floor(3*(pt.x - 22)/98);
	var p = whiteKeyIndex(key);
  if(p.oct != -1 && p.key != -1){
	keystates[p.oct][p.key] = 1;
  if(octave == p.oct)
    keybeenplayed[p.key] = true;
	document.getElementById(pianokeys[p.oct][p.key]).play();
	    setTimeout(function(){
        keystates[p.oct][p.key] = 0;
        keybeenplayed[p.key] = false;
      }, 250);
	}
    }
    if ( 470 <= pt.y && pt.y <= 480){ // a black key was pressed
	var p = {
	    oct:-1,
	    key:-1
        };
	if(  74 < pt.x && pt.x <  93){  p.oct = 0; p.key = 1; }
	if( 104 < pt.x && pt.x < 123){  p.oct = 0; p.key = 3; }
	if( 164 < pt.x && pt.x < 183){  p.oct = 0; p.key = 6; }
	if( 194 < pt.x && pt.x < 213){  p.oct = 0; p.key = 8; }
	if( 224 < pt.x && pt.x < 243){  p.oct = 0; p.key =10; }
	if( 284 < pt.x && pt.x < 303){  p.oct = 1; p.key = 1; }
	if( 314 < pt.x && pt.x < 333){  p.oct = 1; p.key = 3; }
	if( 374 < pt.x && pt.x < 393){  p.oct = 1; p.key = 6; }
	if( 404 < pt.x && pt.x < 423){  p.oct = 1; p.key = 8; }
	if( 434 < pt.x && pt.x < 453){  p.oct = 1; p.key =10; }
	if( 494 < pt.x && pt.x < 513){  p.oct = 2; p.key = 1; }
	if( 524 < pt.x && pt.x < 543){  p.oct = 2; p.key = 3; }
	if( 584 < pt.x && pt.x < 603){  p.oct = 2; p.key = 6; }
	if( 614 < pt.x && pt.x < 633){  p.oct = 2; p.key = 8; }
	if( 644 < pt.x && pt.x < 663){  p.oct = 2; p.key =10; }

	if(p.oct != -1 && p.key != -1){
	keystates[p.oct][p.key] = 1;
  if(octave == p.oct)
    keybeenplayed[p.key] = true;
	document.getElementById(pianokeys[p.oct][p.key]).play();
	    setTimeout(function(){
        keystates[p.oct][p.key] = 0;
        keybeenplayed[p.key] = false;
      }, 250);
	}
    }
    return pt;
}
