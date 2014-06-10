;( function( doc, win, $, LE ) {
	$( doc ).ready(function(){
		var canvas = doc.getElementById("myCanvas"),						// Zadaemo holst
			canvasWidth = canvas.width,										// Zadaemo shirinu holstu
			canvasHeight = canvas.height,									// Zadaemo visotu holstu
			ctx = canvas.getContext("2d"),									// Viznachaemo 2d koordinaty
			AD,																// koefficient difuzii pershoi domishki, m2/s
			BD,																// koefficient difuzii drugoi domishki, m2/s
			canvasData = ctx.getImageData(0, 0, canvasWidth, canvasHeight),
			APR,															// masiv pershoi domishki
			BPR;															// masiv drugoi domishki

		// Stvoruemo ob'ekt dlay zberigannya
		$.storage = new $.store();

		// Funkciya popikselnogo maluvannya
		function drawPixel (x, y, r, g, b, a) {
			var index = (x + y * canvasWidth) * 4;

			canvasData.data[index + 0] = r;
			canvasData.data[index + 1] = g;
			canvasData.data[index + 2] = b;
			canvasData.data[index + 3] = a;
		}

		// Funkciya ponovlennya holstu
		function updateCanvas() {
			ctx.putImageData(canvasData, 0, 0);
		}

		// Funkciya vyznachennya koordinati mishi vidnosno holstu
		function relMouseCoords(event){
			var canvasX = 0, canvasY = 0, canvas = this, canoffset;

			canoffset = $(canvas).offset();
			canvasX = event.clientX + doc.body.scrollLeft + doc.documentElement.scrollLeft - Math.floor(canoffset.left);
			canvasY = event.clientY + doc.body.scrollTop + doc.documentElement.scrollTop - Math.floor(canoffset.top) + 1;

			return {x:canvasX, y:canvasY};
		}
		HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;

		// Funkciya dlya zavantazhennya standartnih parametiv
		function defaultParams() {
			$('#options input[type="text"], #options input[type="number"]').each(function() {
				var name = $(this).attr('name');
				$('#param_' + name).val($('#param_' + name).attr('default'));
			});
			$('#options input[type="radio"], #options input[type="checkbox"]').each(function() {
				if ($(this).attr('default') === 'checked') {
					$(this).attr('checked', true);
				} else {
					$(this).removeAttr('checked');
				}
			});
		}

		// Funkciya ustanovky parametriv
		function setParams() {
			$('#options input[type="text"], #options input[type="number"]').each(function() {
				var name = $(this).attr('name');
				if ($.storage.get(name)) {
					var value = $.storage.get(name);
					$('#param_' + name).val(value);
				} else {
					defaultParams();
				}
			});

			$('#options input[type="radio"], #options input[type="checkbox"]').each(function() {
				var name = $(this).attr('id');
				var value = $.storage.get(name);
				$('#' + name).attr('checked', value);
			});
		}

		// Funkciya otrimannya parametriv vid koristuvacha
		function getParam(name) {
			var $param = $('#param_'+name);

			if ($param.is('[type="number"]')) {
				return parseFloat($param.val());
			}
			if ($param.is('[type="radio"]') || $param.is('[type="checkbox"]')) {
				return $param.is(':checked');
			}
			if ($param.is('select')) {
				return $param.val();
			}

			if ($param.is('.b-space-container')) {
				var aSpaces = [],
					$Spaces = $param.children( '.b-space' );

				$Spaces.each(function() {
					var aValues = [];
					$(this).find('input').each(function() {
						aValues.push( $(this).val() );
					});

					aSpaces.push( aValues );
				});

				return aSpaces;
			}
		}

		// Funkciya zberigannya parametriv
		function saveParams() {
			$('#options input[type="text"], #options input[type="number"]').each(function() {
				var name = $(this).attr('name');
				$.storage.set(name, $('#param_' + name).val());
			});

			$('#options input[type="radio"], #options input[type="checkbox"]').each(function() {
				var name = $(this).attr('id');
				$.storage.set(name, $('#' + name).is(':checked'));
			});
		}

		defaultParams();

		// Funkciya converacii sekund u dd:hh:mm:ss
		function convertTime(secs) {
			var minutes = Math.floor(secs / 60);
			var seconds = secs - minutes*60;
			var hours = Math.floor(minutes / 60);
			var days = Math.floor(hours / 24);

			minutes = minutes - hours*60;
			hours = hours - days*24;

			return (days + ' днів ' + ('0' + hours).slice(-2) + ':' + ('0' + minutes).slice(-2) + ':' + ('0' + seconds).slice(-2));
		}

		$('#formatted_time').html(convertTime($('#param_T').val()));

		$('#param_T').bind('change keyup', function(){
			$('#formatted_time').html(convertTime($('#param_T').val()));
		});

		( function() {
			$('.b-space-add-button').bind( 'click', function() {
				var $Container = $( '#param_' + $(this).data('container') ),
					$Block = $Container.children('.b-space-sample').clone(),
					$Inputs = $Block.children('input'),
					nNewNum = $Container.children('.b-space:last').data('num') + 1 || 1;

				$Block.attr('data-num', nNewNum );

				$Inputs.each(function() {
					var $This = $(this);

					$This.attr('name', $This.attr('name').replace('num', nNewNum));
					$This.attr('id', $This.attr('id').replace('num', nNewNum));
				});

				$Block.removeClass('b-space-sample hidden').addClass('b-space').appendTo( $Container );
			});
			$( '.b-space-remove-button').bind( 'click', function() {
				var $Container = $( '#param_' + $(this).data('container') ),
					$BlockLast = $Container.children('.b-space:last');

				$BlockLast.remove();
			});
		}());

		function updateDiffusion() {
			var TS = getParam('TS'),			// temperatura seredovysha, grad C
				AName = getParam('AName'),		// Persha domishka
				BName = getParam('BName');		// Druga domishka

			function getDiffusion( sName, TS ) {
				return LE[sName].KD * Math.exp( -LE[sName].EA/(0.86e-4*(TS+273)) );
			}

			AD = getDiffusion(AName, TS);
			BD = getDiffusion(BName, TS);

			$( '#koef_A, #koef_B' ).show();
			$( '#dif_A' ).text( AD.toPrecision(3) );
			$( '#dif_B' ).text( BD.toPrecision(3) );
		}

		$('#param_TS, #param_AName, #param_BName').bind('change', updateDiffusion).change();

		function deepCopy(o) {
			var copy = o,k;

			if (o && typeof o === 'object') {
				copy = Object.prototype.toString.call(o) === '[object Array]' ? [] : {};
				for (k in o) {
					copy[k] = deepCopy(o[k]);
				}
			}

			return copy;
		}

		function evaluate() {
			var T = getParam('T'),					// chas processu, sec
				W = getParam('W'),					// shirina plastini, m
				H = getParam('H'),					// glubina plastini, m
				k = canvasHeight,					// proponovana kilkist intervaliv chasu
				xn = 1,								// koeficient mnozhennya n
				n = (canvasWidth-1)/xn,				// proponovana kilkist intervaliv po X
				Cmax = 100,							// granichna rozchinnist, %

				ASpaces = getParam('space-container-A') || [],
				BSpaces = getParam('space-container-B') || [],

				DMax,								// maximalnyi koeficient difiziy, m2/s
				deltaMax,							// maximalno dopustimiy krok po chasu

				// Vikoristovuvaty poperedni rezultaty
				usePrev = $('[name="use_prev"]').is(':checked'),

				dt = T/k,							// delta, sec
				dl = Math.max( W, H )/n,			// krok po X, m
				nx = W/dl,							// kilkist intervaliv po shiriny
				ny = H/dl,							// kilkist intervaliv po glubiny
				G = Math.max(AD, BD)*dt/(dl*dl),	// bezrozmirna difuziya
				Gp = G,								// bezrozmirna difuziya dlya rozrahunkovoi sitki
				P = 1,								// kilkist promizhnyh tochok po chasu
				deltaP,								// krok rozrahunkovoi shemi po chasu
				ANU = [],							// masiv pochatkovih umov pershoi domishki
				BNU = [],							// masiv pochatkovih umov drugoi domishki
				AGU = [],							// masiv granichnih umov pershoi domishki
				BGU = [],							// masiv granichnih umov drugoi domishki
				Aprev = [],							// masiv poperednyogo slou pershoi domishki
				Bprev = [];							// masiv poperednyogo slou drugoi domishki

			if ( BSpaces.length && BD > AD ) {
				DMax = BD;
			} else {
				DMax = AD;
			}

			deltaMax = H*H/(2*DMax);

			if (dt > deltaMax) {
				P = dt/deltaMax;
				deltaP = dt/P;
				Gp = G/P;
			}

			console.log( 'Gp:' );
			console.log( Gp );

			for (var i = 0; i <= nx; i++) {
				AGU[i] = 0;
				BGU[i] = 0;
			}
				
			for (var j = 0; j <= ny; j++) {
				ANU[j] = [];
				BNU[j] = [];

				Aprev[j] = [];
				Bprev[j] = [];

				for (var i = 0; i <= nx; i++) {
					ANU[j][i] = 0;
					BNU[j][i] = 0;
					
					Aprev[j][i] = 0;
					Bprev[j][i] = 0;
				}
			}
			
			if (!APR) {
				APR = [];
				BPR = [];

				for (var j = 0; j <= ny; j++) {
					APR[j] = [];
					BPR[j] = [];

					for (var i = 0; i <= nx; i++) {
						APR[j][i] = 0;
						BPR[j][i] = 0;
					}
				}
			}

			ASpaces.forEach(function(ASpace) {
				for (var i = Math.round(ASpace[0]/dl); i <= Math.round(ASpace[1]/dl); i++) {
					AGU[i] = ASpace[2];
				}
			});
			BSpaces.forEach(function(BSpace) {
				for (var i = Math.round(BSpace[0]/dl); i <= Math.round(BSpace[1]/dl); i++) {
					BGU[i] = BSpace[2];
				}
			});

			console.log( 'AGU:' );
			console.log( AGU );

			for (var i = 0; i <= nx; i++) {
				ANU[0][i] = AGU[i];
				BNU[0][i] = BGU[i];
			}

			console.log( 'ANU[0]:' );
			console.log( ANU[0] );

			if (!usePrev) {
				APR = deepCopy(ANU);
				BPR = deepCopy(BNU);
			}

			console.log( 'APR[0]:' );
			console.log( APR[0] );

			for (var k=0; k < P; k++) {
				Aprev = deepCopy(APR);
				Bprev = deepCopy(BPR);

				console.log( 'Aprev[0]:' );
				console.log( Aprev[0] );

				for (var i = 0; i <= nx; i++) {		// Verhnya ta nizhnya stinki
					if (AGU[i] > 0) {
						APR[0][i] = AGU[i];			// umova pershogo rody
					} else {
						APR[0][i] = Aprev[1][i];	// umova drugogo rody
					}
					APR[ny][i] = Aprev[ny-1][i];	// umova drugogo rody

					if (BGU[i] > 0) {
						BPR[0][i] = BGU[i];			// umova pershogo rody
					} else {
						BPR[0][i] = Bprev[1][i];	// umova drugogo rody
					}
					BPR[ny][i] = Bprev[ny-1][i];	// umova drugogo rody
				};

				console.log( 'Aprev[0][1]:' );
				console.log( Aprev[0][1] );

				for (var j = 0; j <= ny; j++) {		// Liva ta prava stinki
					APR[j][0] = Aprev[j][1];		// umova drugogo rody
					APR[j][nx] = Aprev[j][nx-1];	// umova drugogo rody

					BPR[j][0] = Bprev[j][1];		// umova drugogo rody
					BPR[j][nx] = Bprev[j][nx-1];	// umova drugogo rody
				};

				console.log( 'APR[0][0]:' );
				console.log( APR[0][0] );

				for (var j = 1; j <= ny-1; j++) {
					for (var i = 1; i <= nx-1; i++) {
						APR[j][i] = ( 1-4*Gp )*Aprev[j][i] + Gp*( Aprev[j-1][i] + Aprev[j][i-1] + Aprev[j][i+1] + Aprev[j+1][i] );
						BPR[j][i] = ( 1-4*Gp )*Bprev[j][i] + Gp*( Bprev[j-1][i] + Bprev[j][i-1] + Bprev[j][i+1] + Bprev[j+1][i] );
					}
				}

				if (k = 1) {
					console.log( 'APR[1]:' );
					console.log( APR[1] );
				}
			}

			console.log('usePrev: ' + usePrev);
			console.log('Безрозмірна дифузія: ' + G);

			if (G) {
				$('#diffusion').html(G);
			} else {
				$('#diffusion').html('Помилка!');
				return;
			}

			// if (G > 0.5) {
			// 	if (G > 1000) {
			// 		alert('Ця операція не може бути виконана за розумний час!');
			// 		return;
			// 	} else if (G > 100) {
			// 		if (!confirm('Ця операція займе багато часу, ві впевнені, що хочете продовжити?')) {
			// 			return;
			// 		}
			// 	}
			// 	console.log('Безрозмірна дифузія надто велика, вводимо проміжні точки по часу');
			// 	m = Math.ceil(2*G);
			// 	console.log('Проміжна точка по часу:' + m);
			// 	G = G/m;
			// 	console.log('Безрозмірна дифузія: ' + G);
			// }

			var c_max = 0;
			for (var t = 0; t <= ny; t++) {
				for (var i = 0; i <= nx; i++) {
					if (APR[t][i] > c_max) {
						c_max = APR[t][i];
					}
				}
			}

			var c_extend = new Array(canvasHeight);
			var c_left = null,
				c_right = null,
				c_current = null;
			for (var t = 0; t <= nx; t++) {
				c_extend[t] = new Array(canvasWidth);
				c_extend[t][0] = APR[t][0];
				for (var i = 0; i <= ny+1; i++) {
					c_left = APR[t][i];
					c_right = APR[t][i+1];
					c_extend[t][i*xn] = c_left;
					for (var xi = 1; xi < xn; xi++) {
						c_current = (c_left*(xn-xi)+c_right*xi)/xn;
						c_extend[t][i*xn+xi] = c_current;
					}
				}
			}

			console.log('c_max: ' + c_max);
			if (!c_max) c_max = 1;

			for (var t = 0; t < k+1; t++) {
				for (var i = 0; i < canvasWidth; i++) {
					c_color = Math.ceil(c_extend[t][i] / c_max * 255);
					drawPixel(i, t, c_color, 0, 255-c_color, 255);
				}
			}
			updateCanvas();
			$('#info, #info2').show();

			$('#options .gradient .right').html(c_max + '%');

			$('#myCanvas').mousemove(function() {
				var coords = canvas.relMouseCoords(event),
					canvasX = coords.x,
					canvasY = coords.y;

				$('#coordX').html(canvasX);
				$('#coordY').html(canvasY);
				$('#conc').html(c_extend[canvasY][canvasX].toFixed(3));

				$('#time').html((canvasY*dt).toFixed(0));
				$('#formatted_time2').html(convertTime($('#time').html()));
				$('#abs').html((canvasX*dl/xn).toFixed(10));


				//console.log(canvasX + ':' + canvasY + ':     ' + c_extend[canvasY][canvasX] + '%');

			});
		};

		$('#evaluate').click(function() {
			evaluate();
		});
		$(document).keypress(function(e) {
			if(e.which == 13) {
				evaluate();
			}
		});
		$('#save').click(function() {
			saveParams();
		});
		$('#load').click(function() {
			setParams();
			initCLeft()
		});
		$('#default').click(function() {
			defaultParams();
			initCLeft()
		});
	});

} ( document, window, jQuery, leg_elements ) );