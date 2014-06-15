;( function( doc, win, $, LE ) {
	$( doc ).ready(function(){
		var canvas = doc.getElementById("myCanvas"),						// Zadaemo holst
			canvasWidth = canvas.width,										// Zadaemo shirinu holstu
			canvasHeight = canvas.height,									// Zadaemo visotu holstu
			ctx = canvas.getContext("2d"),									// Viznachaemo 2d koordinaty
			AD,																// koefficient difuzii pershoi domishki, m2/s
			AtypeN,															// tip providnosti pershoi domishki
			BD,																// koefficient difuzii drugoi domishki, m2/s
			BtypeN,															// tip providnosti drugoi domishki
			canvasData = ctx.getImageData(0, 0, canvasWidth, canvasHeight),
			APR,															// masiv pershoi domishki
			BPR,															// masiv drugoi domishki
			Acalc = [],														// rezultuuchiy masiv visualizacii A
			Bcalc = [];														// rezultuuchiy masiv visualizacii B

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
						aValues.push( parseFloat( $(this).val() ) );
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

			return ( (days > 0 ? (days + ' днів ') : '' ) + ('0' + hours).slice(-2) + ':' + ('0' + minutes).slice(-2) + ':' + ('0' + seconds).slice(-2));
		}

		$('#param_T').bind('change keyup', function(){
			$('#formatted_time').html(convertTime( parseFloat( $('#param_T').val()*60 ) ) );
		}).change();

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

			AtypeN = LE[AName].tN;
			BtypeN = LE[BName].tN;

			$( '#koef_A, #koef_B' ).show();
			$( '#dif_A' ).text( (AD*10000).toPrecision(3) );
			$( '#dif_B' ).text( (BD*10000).toPrecision(3) );
		}

		$('#param_TS, #param_AName, #param_BName').bind('change', updateDiffusion).change();

		$('.js-element-select').bind('change', function() {
			var $This = $(this),
				sElement = $This.val(),
				aInputs = $( '.' + $(this).data('inputs') );

			aInputs.each( function() {
				$(this).attr( 'default', LE[sElement].CT.toPrecision(1) );
				$(this).attr( 'value', LE[sElement].CT.toPrecision(1) );
				$(this).attr( 'step', LE[sElement].step.toPrecision(1) );
			});
		});

		function deepCopy(oldObject) {
			var newObject = (oldObject instanceof Array) ? [] : {};
			for (i in oldObject) {
				if (i == 'deepCopy') continue;
				if (oldObject[i] && typeof oldObject[i] == "object") {
					newObject[i] = deepCopy(oldObject[i]);
				} else {
					newObject[i] = oldObject[i];
				}
			}
			return newObject;
		}

		function drawLayer( aX, aY, AGU, BGU, nLayer, dl, nx, ny, xn ) {
			var A_max = 0,
				B_max = 0,
				A_extend = new Array(canvasHeight),
				B_extend = new Array(canvasHeight),
				PN_extend = new Array(canvasHeight),
				KAtype,
				KBtype,
				px = null,
				py = null;

			for (var j = 0; j < ny+1; j++) {
				for (var i = 0; i < nx+1; i++) {
					if (aX[nLayer][j][i] > A_max) {
						A_max = aX[nLayer][j][i];
					}
					if (aY[nLayer][j][i] > B_max) {
						B_max = aY[nLayer][j][i];
					}
				}
			}

			for ( var c = 0; c <= canvasWidth; c++ ) {
				A_extend[c] = new Array(canvasWidth);
				B_extend[c] = new Array(canvasWidth);
				PN_extend[c] = new Array(canvasWidth);
			}

			for ( var j = 0; j < ny; j++ ) {
				for ( var i = 0; i < nx; i++ ) {
					for ( var yi = 0; yi < xn; yi++ ) {
						py = yi/xn;
						for ( var xi = 0; xi < xn; xi++ ) {
							px = xi/xn;

							A_extend[j*xn+yi][i*xn+xi]
								= aX[nLayer][j][i]*(1-py)*(1-px)
								+ aX[nLayer][j][i+1]*(1-py)*px
								+ aX[nLayer][j+1][i]*py*(1-px)
								+ aX[nLayer][j+1][i+1]*py*px;

							B_extend[j*xn+yi][i*xn+xi]
								= aY[nLayer][j][i]*(1-py)*(1-px)
								+ aY[nLayer][j][i+1]*(1-py)*px
								+ aY[nLayer][j+1][i]*py*(1-px)
								+ aY[nLayer][j+1][i+1]*py*px;
						}
					}
				}
			}

			KAtype = AtypeN === true ? 1 : -1;
			KBtype = BtypeN === true ? 1 : -1;

			for (var cy = 0; cy < canvasWidth; cy++) {
				for (var cx = 0; cx < canvasWidth; cx++) {
					PN_extend[cy][cx] = KAtype*A_extend[cy][cx] + KBtype*B_extend[cy][cx];
				}
			}

			var S_max = Math.max( A_max, B_max ) || 1;

			for (var cy = 0; cy < canvasWidth; cy++) {
				for (var cx = 0; cx < canvasWidth; cx++) {
					var A_color = Math.ceil(A_extend[cy][cx] / A_max * 255),
						B_color = Math.ceil(B_extend[cy][cx] / B_max * 255),
						PN_color = 0;

					if ( cy > 0 && cx > 0 && cy < canvasWidth-1 && cx < canvasWidth-1
						&& (
							PN_extend[cy][cx]*PN_extend[cy][cx+1] < 0 ||
							PN_extend[cy][cx]*PN_extend[cy][cx-1] < 0 ||
							PN_extend[cy][cx]*PN_extend[cy-1][cx] < 0 ||
							PN_extend[cy][cx]*PN_extend[cy+1][cx] < 0
						)
					) {
						A_color = 0;
						B_color = 0;
						PN_color = 255;
					}

					if ( cy < 2 && AGU[Math.floor(cx/xn)] === 0 && BGU[Math.floor(cx/xn)] === 0 ) {
						A_color = 0;
						B_color = 255;
						PN_color = 255;
					}

					drawPixel(cx, cy, A_color, B_color, PN_color, 255); // (x, y, r, g, b, a)
				}
			}
			updateCanvas();

			$('#info, #info2').show();
			$('#timeRangeContainer').removeClass('hidden');

			$('#options .gradient1 .right').html((A_max*1e6).toPrecision(3) + 'см<sup>-3</sup>');
			$('#options .gradient2 .right').html((B_max*1e6).toPrecision(3) + 'см<sup>-3</sup>');

			$('#myCanvas').mousemove(function() {
				var coords = canvas.relMouseCoords(event),
					canvasX = coords.x,
					canvasY = coords.y;

				$('#mouseX').html(canvasX);
				$('#mouseY').html(canvasY);
				if ( A_extend[canvasY][canvasX]*1e6 < 1) {
					$('#concA').html('0');
				} else {
					$('#concA').html( (A_extend[canvasY][canvasX]*1e6 || 0).toPrecision(3) );
				}
				if ( B_extend[canvasY][canvasX]*1e6 < 1) {
					$('#concB').html('0');
				} else {
					$('#concB').html( (B_extend[canvasY][canvasX]*1e6 || 0).toPrecision(3) );
				}

				$('#coordX').html( (canvasX*dl*1000/xn).toPrecision(3) );
				$('#coordY').html( (canvasY*dl*1000/xn).toPrecision(3) );
			});
		}

		function evaluate() {
			var T = getParam('T') * 60,				// chas processu, sec
				W = getParam('W') / 1000,			// shirina plastini, m
				H = getParam('H') / 1000,			// glubina plastini, m
				tn = 100,							// proponovana kilkist intervaliv chasu
				xn = 6,								// koeficient mnozhennya n
				n = (canvasWidth-1)/xn,				// proponovana kilkist intervaliv po X
				Cmax = 100,							// granichna rozchinnist, %

				ASpaces = getParam('space-container-A') || [],
				BSpaces = getParam('space-container-B') || [],

				DMax,								// maximalnyi koeficient difiziy, m2/s
				deltaMax,							// maximalno dopustimiy krok po chasu

				// Vikoristovuvaty poperedni rezultaty
				usePrev = $('[name="use_prev"]').is(':checked'),

				dt = T/tn,							// delta, sec
				dl = Math.max( W, H )/n,			// krok po X, m
				nx = Math.round(W/dl),				// kilkist intervaliv po shiriny
				ny = Math.round(H/dl),				// kilkist intervaliv po glubiny
				G = 1,								// bezrozmirna difuziya
				P = 1,								// kilkist promizhnyh tochok po chasu
				deltaP,								// krok rozrahunkovoi shemi po chasu
				ANU = [],							// masiv pochatkovih umov pershoi domishki
				BNU = [],							// masiv pochatkovih umov drugoi domishki
				AGU = [],							// masiv granichnih umov pershoi domishki
				BGU = [],							// masiv granichnih umov drugoi domishki
				Aprev = [],							// masiv poperednyogo slou pershoi domishki
				Bprev = [];							// masiv poperednyogo slou drugoi domishki

			Acalc = [];
			Bcalc = [];

			if ( BSpaces.length && BD > AD ) {
				DMax = BD;
			} else {
				DMax = AD;
			}

			deltaMax = dl*dl/(2*DMax);

			if (dt > deltaMax) {
				P = Math.round(dt/deltaMax+0.5);
			}

			deltaP = dt/P;
			G = DMax*deltaP/(dl*dl);


			if (P*tn > 10000) {
				win.alert('Ця операція не може бути виконана за розумний час!');
				return;
			}
			if (P*tn > 500) {
				if (!win.confirm('Ця операція займе багато часу, ві впевнені, що хочете продовжити?')) {
					return;
				}
			}

			if (P*tn) {
				$('#layers').html(P*tn);
			} else {
				$('#layers').html('Помилка!');
				return;
			}

			for (var i = 0; i < nx+1; i++) {
				AGU[i] = 0;
				BGU[i] = 0;
			}

			for (var j = 0; j < ny+1; j++) {
				ANU[j] = [];
				BNU[j] = [];

				Aprev[j] = [];
				Bprev[j] = [];

				for (var i = 0; i < nx+1; i++) {
					ANU[j][i] = 0;
					BNU[j][i] = 0;

					Aprev[j][i] = 0;
					Bprev[j][i] = 0;
				}
			}

			if (!APR) {
				APR = [];
				BPR = [];

				for (var j = 0; j < ny+1; j++) {
					APR[j] = [];
					BPR[j] = [];

					for (var i = 0; i < nx+1; i++) {
						APR[j][i] = 0;
						BPR[j][i] = 0;
					}
				}
			}

			ASpaces.forEach(function(ASpace) {
				for (var i = Math.round((ASpace[0]/1000)/dl); i <= Math.round((ASpace[1]/1000)/dl); i++) {
					AGU[i] = ASpace[2]/1e6;
				}
			});
			BSpaces.forEach(function(BSpace) {
				for (var i = Math.round((BSpace[0]/1000)/dl); i <= Math.round((BSpace[1]/1000)/dl); i++) {
					BGU[i] = BSpace[2]/1e6;
				}
			});

			for (var i = 0; i < nx+1; i++) {
				ANU[0][i] = AGU[i];
				BNU[0][i] = BGU[i];
			}

			if (!usePrev) {
				APR = deepCopy(ANU);
				BPR = deepCopy(BNU);
			}

			Acalc[0] = deepCopy(APR);
			Bcalc[0] = deepCopy(BPR);

			for (var t=0; t < tn; t++) {
				for (var k=0; k < P; k++) {
					Aprev = deepCopy(APR);
					Bprev = deepCopy(BPR);

					for (var i = 0; i < nx+1; i++) {		// Verhnya ta nizhnya stinki
						if (AGU[i] > 0) {
							APR[0][i] = AGU[i];			// umova pershogo rody
						} else {
							APR[0][i] = ( 1-4*G )*Aprev[0][i] + G*( 2*Aprev[1][i]
								+ ( i > 0 ? Aprev[0][i-1] : Aprev[0][i+1] )
								+ ( i < nx ? Aprev[0][i+1] : Aprev[0][i-1] ) );	// umova drugogo rody
						}
						APR[ny][i] = ( 1-4*G )*Aprev[ny][i] + G*( 2*Aprev[ny-1][i]
								+ ( i > 0 ? Aprev[ny][i-1] : Aprev[ny][i+1] )
								+ ( i < nx ? Aprev[ny][i+1] : Aprev[ny][i-1] ) );	// umova drugogo rody

						if (BGU[i] > 0) {
							BPR[0][i] = BGU[i];			// umova pershogo rody
						} else {
							BPR[0][i] = ( 1-4*G )*Bprev[0][i] + G*( 2*Bprev[1][i]
								+ ( i > 0 ? Bprev[0][i-1] : Bprev[0][i+1] )
								+ ( i < nx ? Bprev[0][i+1] : Bprev[0][i-1] ) );	// umova drugogo rody
						}
						BPR[ny][i] = ( 1-4*G )*Bprev[ny][i] + G*( 2*Bprev[ny-1][i]
								+ ( i > 0 ? Bprev[ny][i-1] : Bprev[ny][i+1] )
								+ ( i < nx ? Bprev[ny][i+1] : Bprev[ny][i-1] ) );	// umova drugogo rody
					};

					for (var j = 1; j < ny; j++) {
						for (var i = 1; i < nx; i++) {
							APR[j][i] = ( 1-4*G )*Aprev[j][i] + G*( Aprev[j-1][i]
								+ ( i > 0 ? Aprev[j][i-1] : Aprev[j][i+1] )
								+ ( i < nx ? Aprev[j][i+1] : Aprev[j][i-1] )
								+ Aprev[j+1][i] );
							BPR[j][i] = ( 1-4*G )*Bprev[j][i] + G*( Bprev[j-1][i]
								+ ( i > 0 ? Bprev[j][i-1] : Bprev[j][i+1] )
								+ ( i < nx ? Bprev[j][i+1] : Bprev[j][i-1] )
								+ Bprev[j+1][i] );
						}
					}
				}

				Acalc[t+1] = deepCopy(APR);
				Bcalc[t+1] = deepCopy(BPR);
			}

			$( '#timeRange' ).val(100);
			$( '#timeRange' ).bind( 'change', function() {
				drawLayer( Acalc, Bcalc, AGU, BGU, $(this).val(), dl, nx, ny, xn );
				$('#time').html( $(this).val()*T/6000 );
				$('#formatted_time2').html( convertTime($('#time').html() * 60) );
			}).change();
		};

		$('#evaluate').click(function() {
			evaluate();
		});
		$(document).keypress(function(e) {
			if(e.which == 13) {
				evaluate();
			}
		});
		$( '#save_image' ).click(function() {
			canvas.toBlob(function(blob) {
				saveAs(blob, 'diffusion.png');
			});
		});
		$( '#save_arrays' ).click(function() {
			var	blobA,
				blobB;

			blob = new Blob(Acalc, {type: "text/plain;charset=utf-8"});
			saveAs(blob, "pershaDomishka.txt");

			blob = new Blob(Bcalc, {type: "text/plain;charset=utf-8"});
			saveAs(blob, "drugaDomishka.txt");
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