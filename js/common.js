;( function( doc, win, $, LE ) {
	$( doc ).ready(function(){
		var canvas = doc.getElementById("myCanvas"),						// Zadaemo holst
			canvasWidth = canvas.width,										// Zadaemo shirinu holstu
			canvasHeight = canvas.height,									// Zadaemo visotu holstu
			ctx = canvas.getContext("2d"),									// Viznachaemo 2d koordinaty
			AD,																// koefficient difuzii pershoi domishki, m2/s
			BD,																// koefficient difuzii drugoi domishki, m2/s
			canvasData = ctx.getImageData(0, 0, canvasWidth, canvasHeight),
			c_prev, c_next, c_full;

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
			$( '#dif_A' ).text( AD );
			$( '#dif_B' ).text( BD );
		}

		$('#param_TS, #param_AName, #param_BName').bind('change', updateDiffusion).change();

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
				G = Math.max(AD, BD)*dt/(dl*dl),	// bezrozmirna difuziya
				P,									// kilkist promizhnyh tochok
				deltaP;								// krok rozrahunkovoi shemi po chasu


			if ( BSpaces.length && BD > AD ) {
				DMax = BD;
			} else {
				DMax = AD;
			}

			deltaMax = H*H/(2*DMax);

			if (dt > deltaMax) {
				P = dt/deltaMax;
				deltaP = dt/P;
			}


			return;

			console.log('usePrev: ' + usePrev);
			console.log('Безрозмірна дифузія: ' + G);
			if (G) {
				$('#diffusion').html(G);
			} else {
				$('#diffusion').html('Помилка!');
				return;
			}

			if (G > 0.5) {
				if (G > 1000) {
					alert('Ця операція не може бути виконана за розумний час!');
					return;
				} else if (G > 100) {
					if (!confirm('Ця операція займе багато часу, ві впевнені, що хочете продовжити?')) {
						return;
					}
				}
				console.log('Безрозмірна дифузія надто велика, вводимо проміжні точки по часу');
				m = Math.ceil(2*G);
				console.log('Проміжна точка по часу:' + m);
				G = G/m;
				console.log('Безрозмірна дифузія: ' + G);
			}

			console.log(c_prev);
			if (!usePrev || !c_prev) {
				c_prev = new Array(n+1);
				c_next = new Array(n+1);
				c_full = new Array(k+1);

				for (var t = 0; t < k+1; t++) {
					c_full[t] = new Array(n+1);
				}

				// Pochatkovi umovy
				for (var i = 0; i < n+1; i++) {
					c_prev[i] = 0;
				}
			} else {
				console.log('Використовуємо попередні значення! ' + c_prev[0])
				for (var i = 0; i < n+1; i++) {
					c_full[0][i] = c_prev[i];
				}
			}

			if (sk) {
				boundTypeLeft = 2;
			}

			// Granichni umovy
			switch (boundTypeLeft) {
				case 1:
					c_prev[0] = C1m;
					break;
				case 2:
					c_prev[0] = c_prev[1];
					break;
				case 3:
					if (typeLeft3 == 2) {
						c_prev[0] = c_prev[1];
					}
					if (typeLeft3 == 1) {
						var dQL = (c_prev[0] - c_prev[1])*G*dl;		// Vitrata leguuchoi prisadki dlya umov pershogo rodu
						if (dQL < 0) {								// Yaksho vytraty prisadki videmni
							c_prev[0] = c_prev[1];					// Priminyaemo umovy drugogo rodu
							typeLeft3 = 2;							//
						} else {									// Yaksho vytraty prisadki dodatni
							if (QL+dQL < Q1) {						// Yaksho prisadki vistachae
								c_prev[0] = C1m;					// Granichni umovi pershogo rodu
								QL += dQL;							// Sumarna vitrata leguuchoi prisadki
							} else if (QL < Q1) {					// Yaksho prisadki ne vistachae
								c_prev[0] -= (Q1 - QL)/(2*G * dl);	// Pererahovuemo concentracii vyhodyachi z realnoi kilkosti prisadki
								c_prev[1] = c_prev[0];				// Priminyaemo umovy drugogo rodu
								typeLeft3 = 2;						//
							}
						}
					}
					break;
				default:
					break;
			}
			switch (boundTypeRight) {
				case 1:
					c_prev[n] = C2m;
					break;
				case 2:
					c_prev[n] = c_prev[n-1];
					break;
				case 3:
					if (typeRight3 == 2) {
						c_prev[n] = c_prev[n-1];
					}
					if (typeRight3 == 1) {
						var dQR = (c_prev[n] - c_prev[n-1])*G*dl;	// Vitrata leguuchoi prisadki dlya umov pershogo rodu
						if (dQR < 0) {								// Yaksho vytraty prisadki videmni
							c_prev[n] = c_prev[n-1];				// Priminyaemo umovy drugogo rodu
							typeRight3 = 2;							//
						} else {									// Yaksho vytraty prisadki dodatni
							if (QR+dQR < Q2) {						// Yaksho prisadki vistachae
								c_prev[n] = C2m;					// Granichni umovi pershogo rodu
								QR += dQR;							// Sumarna vitrata leguuchoi prisadki
							} else if (QR < Q2) {					// Yaksho prisadki ne vistachae
								c_prev[n] -= (Q2 - QR)/(2*G * dl);	// Pererahovuemo concentracii vyhodyachi z realnoi kilkosti prisadki
								c_prev[n-1] = c_prev[n];			// Priminyaemo umovy drugogo rodu
								typeRight3 = 2;						//
							}
						}
					}
					break;
				default:
					break;
			}

			if (!usePrev) {
				for (var i = 0; i < n+1; i++) {
					c_full[0][i] = c_prev[i];
				}
			}

			QL = 0;
			QR = 0;
			typeLeft3 = 1;							// Pochatkoviy stan dlya kombinovanogo tipu umov L
			typeRight3 = 1;							// Pochatkoviy stan dlya kombinovanogo tipu umov R
			for (var t = 1; t <= k; t++) { 			// Cikl po chasu dlya zadanih tochok
				for (var p = 0; p < m; p++) {		// Cikl po chasu dlya promizhnih tochok
					for (var i = 1; i < n; i++) {	// Cikl po koordinati dlya zadanih tochok
						if (sk) {
							c_next[i] = G*(2*i+1)/(2*i)*c_prev[i-1] + (1-2*G)*c_prev[i] + G*(2*i-1)/(2*i)*c_prev[i+1];	// Rizniceva shema dlya drugogo zakonu Fika
						} else {
							c_next[i] = G*c_prev[i-1] + (1-2*G)*c_prev[i] + G*c_prev[i+1];	// Rizniceva shema dlya drugogo zakonu Fika
						}
					}

					switch (boundTypeLeft) {
						case 1:
							c_next[0] = C1m;
							break;
						case 2:
							c_next[0] = c_next[1];
							break;
						case 3:
							if (typeLeft3 == 2) {
								c_next[0] = c_next[1];
							}
							if (typeLeft3 == 1) {
								var dQL = (c_prev[0] - c_prev[1])*G*dl;		// Vitrata leguuchoi prisadki dlya umov pershogo rodu
								if (dQL < 0) {								// Yaksho vytraty prisadki videmni
									c_next[0] = c_next[1];					// Priminyaemo umovy drugogo rodu
									typeLeft3 = 2;
								} else {									// Yaksho vytraty prisadki dodatni
									if (QL+dQL < Q1) {						// Yaksho prisadki vistachae
										c_next[0] = C1m;					// Granichni umovi pershogo rodu
										QL += dQL;							// Sumarna vitrata leguuchoi prisadki
									} else if (QL < Q1) {					// Yaksho prisadki ne vistachae
										c_next[0] -= (Q1 - QL)/(2*G * dl);	// Pererahovuemo concentracii vyhodyachi z realnoi kilkosti prisadki
										c_next[1] = c_next[0];				// Priminyaemo umovy drugogo rodu
										typeLeft3 = 2;						//
									}
								}
							}
							break;
						default:
							break;
					}

					switch (boundTypeRight) {
						case 1:
							c_next[n] = C2m;
							break;
						case 2:
							c_next[n] = c_next[n-1];
							break;
						case 3:
							if (typeRight3 == 2) {
								c_next[n] = c_next[n-1];
							}
							if (typeRight3 == 1) {
								var dQR = (c_prev[n] - c_prev[n-1])*G*dl;	// Vitrata leguuchoi prisadki dlya umov pershogo rodu
								if (dQR < 0) {								// Yaksho vytraty prisadki videmni
									c_next[n] = c_next[n-1];				// Priminyaemo umovy drugogo rodu
									typeRight3 = 2;							//
								} else {									// Yaksho vytraty prisadki dodatni
									if (QR+dQR < Q2) {						// Yaksho prisadki vistachae
										c_next[n] = C2m;					// Granichni umovi pershogo rodu
										QR += dQR;							// Sumarna vitrata leguuchoi prisadki
									} else if (QR < Q2) {					// Yaksho prisadki ne vistachae
										c_next[n] -= (Q2 - QR)/(2*G * dl);	// Pererahovuemo concentracii vyhodyachi z realnoi kilkosti prisadki
										c_next[n-1] = c_next[n];			// Priminyaemo umovy drugogo rodu
										typeRight3 = 2;						//
									}
								}
							}
							break;
						default:
							break;
					}

					for (var i = 0; i < n+1; i++) {
						c_prev[i] = c_next[i];
					}
				}
				for (var i = 0; i < n+1; i++) {		// Zapamyataly masiv na potochniy chas
					c_full[t][i] = c_prev[i];
				}
			}

			var c_max = 0;
			for (var t = 0; t < k+1; t++) {
				for (var i = 0; i < n+1; i++) {
					if (c_full[t][i] > c_max) {
						c_max = c_full[t][i];
					}
				}
			}

			var c_extend = new Array(canvasHeight);
			var c_left = null,
				c_right = null,
				c_current = null;
			for (var t = 0; t < k+1; t++) {
				c_extend[t] = new Array(canvasWidth);
				c_extend[t][0] = c_full[t][0];
				for (var i = 0; i < n+1; i++) {
					c_left = c_full[t][i];
					c_right = c_full[t][i+1];
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