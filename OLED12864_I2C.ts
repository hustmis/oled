/**
 * XinaBox OD01 extension for makecode
 * Base on OLED Package from microbit/micropython Chinese community.
 *   https://github.com/makecode-extensions/OLED12864_I2C
 */

// 6x8 font
const Font_5x7 = hex`000000000000005F00000007000700147F147F14242A072A12231308646237495522500005030000001C2241000041221C00082A1C2A0808083E080800503000000808080808006060000020100804023E5149453E00427F400042615149462141454B311814127F1027454545393C4A49493001710905033649494936064949291E003636000000563600000008142241141414141441221408000201510906324979413E7E1111117E7F494949363E414141227F4141221C7F494949417F090901013E414151327F0808087F00417F41002040413F017F081422417F404040407F0204027F7F0408107F3E4141413E7F090909063E4151215E7F09192946464949493101017F01013F4040403F1F2040201F7F2018207F63140814630304780403615149454300007F4141020408102041417F000004020102044040404040000102040020545454787F484444383844444420384444487F3854545418087E090102081454543C7F0804047800447D40002040443D00007F10284400417F40007C041804787C0804047838444444387C14141408081414187C7C080404084854545420043F4440203C4040207C1C2040201C3C4030403C44281028440C5050503C4464544C44000836410000007F000000413608000201020402`

//% weight=50 color=#0855AA icon="O" block="OLED12864_I2C"
namespace OLED12864_I2C {
    export enum DISPLAY_ONOFF {
        //% block="ON"
        DISPLAY_ON = 1,
        //% block="OFF"
        DISPLAY_OFF = 0
    }

    const MIN_X = 0
    const MIN_Y = 0
    const MAX_X = 127
    const MAX_Y = 63

    let _I2CAddr = 0
    let _screen = pins.createBuffer(1025)
    let _buf2 = pins.createBuffer(2)
    let _buf3 = pins.createBuffer(3)
    let _buf4 = pins.createBuffer(4)
    let _buf7 = pins.createBuffer(7)
    _buf7[0] = 0x40
    let _DRAW = 1
	let _savDRAW = 1
    let _cx = 0
    let _cy = 0
	let _ZOOM = 0;

    function cmd1(d: number) {
        let n = d % 256;
        pins.i2cWriteNumber(_I2CAddr, n, NumberFormat.UInt16BE);
    }

    function cmd2(d1: number, d2: number) {
        _buf3[0] = 0;
        _buf3[1] = d1;
        _buf3[2] = d2;
        pins.i2cWriteBuffer(_I2CAddr, _buf3);
    }

    function cmd3(d1: number, d2: number, d3: number) {
        _buf4[0] = 0;
        _buf4[1] = d1;
        _buf4[2] = d2;
        _buf4[3] = d3;
        pins.i2cWriteBuffer(_I2CAddr, _buf4);
    }

    function set_pos(col: number = 0, page: number = 0) {
        cmd1(0xb0 | page) // page number
		let c = col * (_ZOOM + 1);
        cmd1(0x00 | (c % 16)) // lower start column address
        cmd1(0x10 | (c >> 4)) // upper start column address    
    }

    // clear bit
    function clrbit(d: number, b: number): number {
        if (d & (1 << b))
            d -= (1 << b)
        return d
    }

    /**
     * draw / refresh screen
     */
    function draw(d: number) {
        if (d > 0) {
            set_pos()
            pins.i2cWriteBuffer(_I2CAddr, _screen)
        }
    }

    /**
     * set pixel in OLED
     */
    //% blockId="OLED12864_I2C_PIXEL" block="set pixel at x %x|y %y|color %color"
    //% x.max=128 x.min=0 x.defl=0
    //% y.max=64 y.min=0 y.defl=0
    //% color.max=1 color.min=0 color.defl=1
    //% weight=65 blockGap=8
    export function pixel(x: number, y: number, color: number = 1) {
        let page = y >> 3
        let shift_page = y % 8
        let ind = x * (_ZOOM + 1)  + page * 128 + 1
        let b = (color) ? (_screen[ind] | (1 << shift_page)) : clrbit(_screen[ind], shift_page)
        _screen[ind] = b
		if (_ZOOM) {
			_screen[ind + 1] = b;
		 
			if (_DRAW) {
				set_pos(x, page)
			   _buf3[0] = 0x40;
			   _buf3[1] = _buf3[2] = b;
			   pins.i2cWriteBuffer(_I2CAddr, _buf3);
			}
		} else {
			if (_DRAW) {
				set_pos(x, page)
				_buf2[0] = 0x40
				_buf2[1] = b
				pins.i2cWriteBuffer(_I2CAddr, _buf2)
			}
		}
    }

    function char(c: string, col: number, row: number, color: number = 1) {
        let p = (Math.min(127, Math.max(c.charCodeAt(0), 32)) - 32) * 5
        let ind = 0

        for (let i = 0; i < 5; i++) {
			ind = col * (_ZOOM + 1) + row * 128 + i * (_ZOOM + 1) + 1
            _screen[ind] = (color > 0) ? Font_5x7[p + i] : Font_5x7[p + i] ^ 0xFF
			if (_ZOOM) _screen[ind + 1] = _screen[ind];
            //_buf7[i + 1] = _screen[ind]
        }
        _screen[ind + 1] = (color > 0) ? 0 : 0xFF
		_screen[ind + 1 * (_ZOOM + 1)] = _screen[ind + 1]
        //_buf7[6] = _screen[ind + 1]
        //set_pos(col, row)
        //pins.i2cWriteBuffer(_I2CAddr, _buf7)
		draw(_DRAW)
    }

    /**
     * show text in OLED
     */
    //% blockId="OLED12864_I2C_SHOWSTRING" block="show string %s|at col %col|row %row|color %color"
    //% s.defl='Hello'
    //% col.max=120 col.min=0 col.defl=0
    //% row.max=7 row.min=0 row.defl=0
    //% color.max=1 color.min=0 color.defl=1
    //% weight=80 blockGap=8 inlineInputMode=inline
    export function String(s: string, col: number, row: number, color: number = 1) {
        for (let n = 0; n < s.length; n++) {
            char(s.charAt(n), col, row, color)
            col += 6 * (_ZOOM + 1)
            if (col > (MAX_X - 6 * (_ZOOM + 1))) return
        }
    }
      /**
     * show mirrored text in OLED
     */
    //% blockId="OLED12864_I2C_SHOWSTRING_MIRRORED" block="show mirrored string %s|at col %col|row %row|color %color"
    //% s.defl="Hello"
    //% col.max=120 col.min=0 col.defl=0
    //% row.max=7 row.min=0 row.defl=0
    //% color.max=1 color.min=0 color.defl=1
    //% weight=79 blockGap=8 inlineInputMode=inline
    export function StringMirrored(s: string, col: number, row: number, color: number = 1) {
        for (let n = 0; n < s.length; n++) {
            let c = s.charAt(s.length - 1 - n)
            let p = (Math.min(127, Math.max(c.charCodeAt(0), 32)) - 32) * 5
            let ind = col + row * 128 + 1
			
            for (let i = 0; i < 5; i++) {
                let mirrored = Font_5x7[p + (5-1-i)]
                _screen[ind + i] = (color > 0) ? mirrored : mirrored ^ 0xFF
                _buf7[i + 1] = _screen[ind + i]
            }

            _screen[ind + 5] = (color > 0) ? 0 : 0xFF
            _buf7[6] = _screen[ind + 5]
            set_pos(col, row)
            pins.i2cWriteBuffer(_I2CAddr, _buf7)

            col += 6
            if (col > (MAX_X - 6)) return
        }
    }
    /**
     * show a number in OLED
     */
    //% blockId="OLED12864_I2C_NUMBER" block="show Number %num|at col %col|row %row|color %color"
    //% num.defl=100
    //% col.max=120 col.min=0 col.defl=0
    //% row.max=7 row.min=0 row.defl=0
    //% color.max=1 color.min=0 color.defl=1
    //% weight=80 blockGap=8 inlineInputMode=inline
    export function Number(num: number, col: number, row: number, color: number = 1) {
        String(num.toString(), col, row, color)
    }

    function scroll() {
        _cx = 0
        _cy++
        if (_cy > 7) {
            _cy = 7
            _screen.shift(128)
            _screen[0] = 0x40
            draw(_DRAW)
        }
    }

    /**
     * print a text in OLED
     */
    //% block="print %s|color %color|newline %newline"
    //% s.defl="string"
    //% color.max=1 color.min=0 color.defl=1
    //% newline.defl=true
    //% weight=80 blockGap=8 inlineInputMode=inline
    export function printString(s: string, color: number, newline: boolean = true) {
        for (let n = 0; n < s.length; n++) {
            char(s.charAt(n), _cx, _cy, color)
            _cx += 6
            if (_cx > 120) {
                scroll()
            }
        }
        if (newline) {
            scroll()
        }
    }

    /**
     * print a Number in OLED
     */
    //% block="print number %num|color %color|newline %newline"
    //% s.defl="0"
    //% color.max=1 color.min=0 color.defl=1
    //% newline.defl=true
    //% weight=80 blockGap=8 inlineInputMode=inline
    export function printNumber(num: number, color: number, newline: boolean = true) {
        printString(num.toString(), color, newline)
    }

    /**
     * draw a horizontal line
     */
    //% blockId="OLED12864_I2C_HLINE" block="draw a horizontal line at x %x|y %y|length %len|color %color"
    //% x.max=127 x.min=0 x.defl=0
    //% y.max=63 y.min=0 y.defl=0
    //% len.max=128 len.min=1 len.defl=16
    //% color.max=1 color.min=0 color.defl=1
    //% weight=71 blockGap=8 inlineInputMode=inline
    export function hline(x: number, y: number, len: number, color: number = 1) {
        _savDRAW = _DRAW
        if ((y < MIN_Y) || (y > MAX_Y)) return
        _DRAW = 0
        for (let i = x; i < (x + len); i++)
            if ((i >= MIN_X) && (i <= MAX_X))
                pixel(i, y, color)
        _DRAW = _savDRAW
        draw(_DRAW)
    }

    /**
     * draw a vertical line
     */
    //% blockId="OLED12864_I2C_VLINE" block="draw a vertical line at x %x|y %y|length %len|color %color"
    //% x.max=127 x.min=0 x.defl=0
    //% y.max=63 y.min=0 y.defl=0
    //% len.max=128 len.min=1 len.defl=16
    //% color.max=1 color.min=0 color.defl=1
    //% weight=71 blockGap=8 inlineInputMode=inline
    export function vline(x: number, y: number, len: number, color: number = 1) {
        _savDRAW = _DRAW
        _DRAW = 0
        if ((x < MIN_X) || (x > MAX_X)) return
        for (let i = y; i < (y + len); i++)
            if ((i >= MIN_Y) && (i <= MAX_Y))
                pixel(x, i, color)
        _DRAW = _savDRAW
        draw(_DRAW)
    }
	
    /**
     * Draw Line
     * @param x0 x0. eg: 0
     * @param y0 y0. eg: 0
     * @param x1 x1. eg: 20
     * @param y1 y1. eg: 20
	 * @param color is the color of the line, eg: 1
     */
    //% blockId=OLED12864_I2C_drawLine
    //% block="draw line from:|x: %x0 y: %y0 to| x: %x1 y: %y1|color %color"
    //% weight=71 blockGap=8 inlineInputMode=inline
    export function drawLine(x0: number, y0: number, x1: number, y1: number, color: number = 1) {
        _savDRAW = _DRAW
        _DRAW = 0
		
		let kx: number, ky: number, c: number, i: number, dx: number, dy: number;

        dx = Math.abs(x1 - x0);
        dy = Math.abs(y1 - y0);
        kx = x0 < x1 ? 1 : -1;
        ky = y0 < y1 ? 1 : -1;

        if (dx >= dy) {
            c = dx;
            for (i = 0; i < dx; i++, x0 += kx) {
				pixel(x0, y0, color);
                c -= dy;
                if (c <= 0) {
                    y0 += ky;
                    c += dx;
                }
            }
        } else {
            c = dy;
            for (i = 0; i < dy; i++, y0 += ky) {
                pixel(x0, y0, color);
                c -= dx;
                if (c <= 0) {
                    x0 += kx;
                    c += dy;
                }
            }
        }
		
        _DRAW = _savDRAW
        draw(_DRAW)
    }

    /**
     * fill a rectangle
     */
    //% blockId="OLED12864_I2C_FILLEDRECT" block="fill a rectangle at x1 %x1|y1 %y1|x2 %x2|y2 %y2|color %color"
    //% color.defl=1
    //% weight=70 blockGap=8 inlineInputMode=inline
    export function filledRect(x1: number, y1: number, x2: number, y2: number, color: number = 1) {
        if (x1 > x2)
            x1 = [x2, x2 = x1][0];
        if (y1 > y2)
            y1 = [y2, y2 = y1][0];
        _savDRAW = _DRAW
        _DRAW = 0
	  for (let i = y1; i <= y2; i++) {
		  hline(x1, i, x2 - x1 + 1, color)
	  }
        _DRAW = _savDRAW
        draw(_DRAW)
    }
	
    /**
     * draw a rectangle
     */
    //% blockId="OLED12864_I2C_RECT" block="draw a rectangle at x1 %x1|y1 %y1|x2 %x2|y2 %y2|color %color"
    //% color.defl=1
    //% weight=70 blockGap=8 inlineInputMode=inline
    export function rect(x1: number, y1: number, x2: number, y2: number, color: number = 1) {
        if (x1 > x2)
            x1 = [x2, x2 = x1][0];
        if (y1 > y2)
            y1 = [y2, y2 = y1][0];
        _savDRAW = _DRAW
        _DRAW = 0
        hline(x1, y1, x2 - x1 + 1, color)
        hline(x1, y2, x2 - x1 + 1, color)
        vline(x1, y1, y2 - y1 + 1, color)
        vline(x2, y1, y2 - y1 + 1, color)
        _DRAW = _savDRAW
        draw(_DRAW)
    }

    /**
     * invert display
     * @param d true: invert / false: normal, eg: true
     */
    //% blockId="OLED12864_I2C_INVERT" block="Invert display %d"
    //% weight=62 blockGap=8
    export function invert(d: boolean = true) {
        let n = (d) ? 0xA7 : 0xA6
        cmd1(n)
    }

    /**
     * brightness
     */
    //% blockId="OLED12864_I2C_BRIGHTNESS" block="brightness %d"
    //% d.defl=207
    //% weight=62 blockGap=8
    export function brightness(d: number = 207) {
        cmd2(0x81, d)
    }
	
    /**
     * set render screen
     * @param d true: render screen / false: don't render screen, eg: false
     */
    //% blockId="OLED12864_I2C_SETRENDERSCREEN" block="set render screen %d"
    //% weight=30 blockGap=8
    export function setRenderScreen(d: boolean = false) {
        _DRAW = (d) ? 1 : 0
		_savDRAW = _DRAW
    }

    /**
     * refresh screen
     */
    //% blockId="OLED12864_I2C_REFRESH" block="refresh screen"
    //% weight=30 blockGap=8
    export function refresh() {
        draw(1);
    }

    /**
     * clear screen
	 * @param d true: redraw / false: empty buffer, eg: true
     */
    //% blockId="OLED12864_I2C_CLEAR" block="Clear screen %d"
    //% weight=30 blockGap=8
    export function clear(d: boolean = true) {
        _cx = _cy = 0
        _screen.fill(0)
        _screen[0] = 0x40
        draw((d) ? 1 : 0)
    }

    /**
     * turn on/off screen
     */
    //% blockId="OLED12864_I2C_ON" block="Display %on"
    //% on.defl=1
    //% weight=62 blockGap=8
    export function display(on: DISPLAY_ONOFF=DISPLAY_ONOFF.DISPLAY_ON) {
        let d = (on == DISPLAY_ONOFF.DISPLAY_ON) ? 0xAF : 0xAE;
        cmd1(d)
    }
	
	  /**
	   * zoom mode
	   * @param d true zoom / false normal, eg: true
	   */
	  //% blockId="OLED12864_I2C_ZOOM" block="zoom %d"
	  //% weight=60 blockGap=8
	  export function zoom(d: boolean = true) {
		_ZOOM = d ? 1 : 0;
		cmd2(0xd6, _ZOOM);
	  }
	  
  /**
   * draw an outlined circle
   * @param x is the x coordinate of the center, eg: 0
   * @param y is the y coordinate of the center, eg: 0
   * @param r is the radius of the circle, eg: 10
   * @param color is the color of the circle, eg: 1
   */
  //% blockId="OLED12864_I2C_OUTLINEDCIRCLE" block="draw outlined circle at x %x|y %y|radius %r|color %color"
  //% inlineInputMode=inline
  //% weight=62 blockGap=8
  export function outlinedCircle(x: number, y: number, r: number, color: number = 1) {
	  _savDRAW = _DRAW
      _DRAW = 0
      const step = 1 / r;
      for (let theta = 0; theta < 2 * Math.PI; theta += step) {
          let xPos = x + Math.round(r * Math.cos(theta));
          let yPos = y + Math.round(r * Math.sin(theta));
          pixel(xPos, yPos, color);
      }
  	  _DRAW = _savDRAW
      draw(_DRAW)
  }
  /**
   * draw a filled circle
   * @param x is the x coordinate of the center, eg: 0
   * @param y is the y coordinate of the center, eg: 0
   * @param r is the radius of the circle, eg: 10
   * @param color is the color of the circle, eg: 1
   */
  //% blockId="OLED12864_I2C_FILLEDCIRCLE" block="draw filled circle at x %x|y %y|radius %r|color %color"
  //% inlineInputMode=inline
  //% weight=62 blockGap=8
  export function filledCircle(x: number, y: number, r: number, color: number = 1) {
	  _savDRAW = _DRAW
      _DRAW = 0
      for (let j = 0; j <= r; j++) {
          const step = 1 / j;
          for (let theta = 0; theta < 2 * Math.PI; theta += step) {
              let xPos = x + Math.round(j * Math.cos(theta));
              let yPos = y + Math.round(j * Math.sin(theta));
              pixel(xPos, yPos, color);
          }
      }
  	  _DRAW = _savDRAW
      draw(_DRAW)
  }
  
    /**
     * get pixel in OLED
     */
    //% blockId="OLED12864_I2C_GETPIXEL" block="get pixel at x %x|y %y|color %color"
    //% x.max=128 x.min=0 x.defl=0
    //% y.max=64 y.min=0 y.defl=0
    //% color.max=1 color.min=0 color.defl=1
    //% weight=62 blockGap=8
    export function getPixel(x: number, y: number, color: number = 1): boolean {
        let page = y >> 3
        let shift_page = y % 8
        let ind = x * (_ZOOM + 1)  + page * 128 + 1
		let bit = (1 << shift_page)
		let yes = (_screen[ind] & bit) == bit
		return (color) ? yes : (!yes);
    }
  
  function drawBytes(x: number, y: number, bytes: number[] = null, width: number = 4, height: number = 4, color: number = 1) {
	  _savDRAW = _DRAW
      _DRAW = 0
	  if(bytes!=null){
	  let bit=0
	  for (let i = 0; i < bytes.length; i++) {
    	  for (let j = i*8; j < (i+1)*8; j++) {
			if(j>=width*height) continue;
			bit=(bytes[i]>>(8-1-(j-i*8)))&0x1;
			pixel(x+j%width, y+j/width, bit==1?color:color^0x1);
	      }
	  }
	  }
	  else{
		  filledRect(x, y, x+width-1, y+height-1, color);
	  }
  	  _DRAW = _savDRAW
      draw(_DRAW)
  }
  
  /**
   * draw spirits
   */
  //% blockId="OLED12864_I2C_DRAWSPIRITS" block="draw spirits %spirits"
  //% inlineInputMode=inline
  //% weight=62 blockGap=8
  export function drawSpirits(spirits: Spirit[]) {
	  for (let i = 0; i < spirits.length; i++) {
		  let spirit=spirits[i];
		  drawBytes(spirit._x,spirit._y,spirit._bytes,spirit._width,spirit._height,spirit._color);
	  }
  }
  
  /**
   * create spirit
   * @param x is the x coordinate of the center, eg: 0
   * @param y is the y coordinate of the center, eg: 0
   * @param isPlayer is the player, eg: false
   * @param step is the pixels of one move, eg: 4
   * @param bytes is the pixels byte array, eg: null
   * @param width is the pixels width, eg: 4
   * @param height is the pixels height, eg: 4
   * @param color is the color of the circle, eg: 1
   */
  //% blockId="OLED12864_I2C_CREATESPIRIT" block="create spirit at x %x y %y|isPlayer %isPlayer step %step|bytes %bytes|width %width height %height color %color"
  //% inlineInputMode=inline
  //% weight=62 blockGap=8
  export function createSpirit(x: number, y: number, isPlayer: boolean = false, step: number = 4, bytes: number[] = null, width: number = 4, height: number = 4, color: number = 1): Spirit {
	  let spirit=new Spirit();
	  spirit._x=x;
	  spirit._y=y;
	  spirit._isPlayer=isPlayer;
	  spirit._step=step;
	  spirit._bytes=bytes;
	  spirit._width=width;
	  spirit._height=height;
	  spirit._color=color;
	  spirit.move(0,0);
	  return spirit;
  }
  
  /**
   * Spirit
   */
  export class Spirit {
	  _x: number = 0;
	  _y: number = 0;
	  _bytes: number[] = null;
	  _width: number = 4;
	  _height: number = 4;
	  _color: number = 1;
	  _step: number = 4;
	  _isPlayer: boolean = false;
	  
	  /**
	   * move spirit
	   * @param stepX is the x move, eg: 1
	   * @param stepY is the y move, eg: 0
	   */
	  //% blockId="OLED12864_I2C_SPIRIT_MOVE" block="%spirit|move step stepX %stepX stepY %stepY"
	  //% inlineInputMode=inline
	  move(stepX: number = 1, stepY: number = 0){
		  this._x=((128-this._width)+this._x+stepX*this._step)%(128-this._width);
		  this._y=((64-this._height)+this._y+stepY*this._step)%(64-this._height);
	  }
  }
  
  function getPlayer(spirits: Spirit[]): Spirit {
	  for (let i = 0; i < spirits.length; i++) {
		  let spirit=spirits[i];
		  if(spirit._isPlayer) return spirit;
	  }
	  return new Spirit();
  }
  
  /**
   * spirits collision
   */
  //% blockId="OLED12864_I2C_COLLISION" block="spirits collision %spirits"
  //% inlineInputMode=inline
  export function collision(spirits: Spirit[], handle: () => void) {
	  let player=getPlayer(spirits);
	  
	  for (let i = 0; i < spirits.length; i++) {
		  let spirit=spirits[i];
		  if(player!=spirit) {
			  if(player._x < spirit._x + spirit._width-1 && player._x + player._width-1 > spirit._x && player._y < spirit._y + spirit._height-1 && player._y + player._height-1 > spirit._y) {
				  spirit._y=0;
				  spirit._x=Math.floor(Math.random() * (128-spirit._width));
				  handle();
			  }
		  }
	  }
  }

    /**
     * OLED initialize
	 * @param addr is i2c addr, eg: 61
     */
    //% blockId="OLED12864_I2C_init" block="init OLED with addr %addr"
    //% weight=90 blockGap=8
    export function init(addr: number = 61) {
        _I2CAddr = addr;
        cmd1(0xAE)       // SSD1306_DISPLAYOFF
        cmd1(0xA4)       // SSD1306_DISPLAYALLON_RESUME
        cmd2(0xD5, 0xF0) // SSD1306_SETDISPLAYCLOCKDIV
        cmd2(0xA8, 0x3F) // SSD1306_SETMULTIPLEX
        cmd2(0xD3, 0x00) // SSD1306_SETDISPLAYOFFSET
        cmd1(0 | 0x0)    // line #SSD1306_SETSTARTLINE
        cmd2(0x8D, 0x14) // SSD1306_CHARGEPUMP
        cmd2(0x20, 0x00) // SSD1306_MEMORYMODE
        cmd3(0x21, 0, 127) // SSD1306_COLUMNADDR
        cmd3(0x22, 0, 63)  // SSD1306_PAGEADDR
        cmd1(0xa0 | 0x1) // SSD1306_SEGREMAP
        cmd1(0xc8)       // SSD1306_COMSCANDEC
        cmd2(0xDA, 0x12) // SSD1306_SETCOMPINS
        cmd2(0x81, 0xCF) // SSD1306_SETCONTRAST
        cmd2(0xd9, 0xF1) // SSD1306_SETPRECHARGE
        cmd2(0xDB, 0x40) // SSD1306_SETVCOMDETECT
        cmd1(0xA6)       // SSD1306_NORMALDISPLAY
        cmd2(0xD6, 0)    // zoom off
        cmd1(0xAF)       // SSD1306_DISPLAYON
        clear()
    }

}  
