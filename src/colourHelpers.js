export function hsvColorDistance_1(color1, color2) {
    const deltaH = color1.h - color2.h;
    const deltaS = color1.s - color2.s;
    const deltaV = color1.v - color2.v;
    return Math.sqrt(deltaH * deltaH + deltaS * deltaS + deltaV * deltaV);
}

export function hsvColorDistance_2(color1, color2) {
    const deltaH = Math.abs((color1.h - color2.h + 180) % 360 - 180);
    const deltaS = (color1.s - color2.s) / 100;
    const deltaL = (color1.v - color2.v) / 100;

    return Math.sqrt(deltaH * deltaH + deltaS * deltaS + deltaL * deltaL);
}

export function hsvColorDistance_5(color1, color2) {
    const deltaH = (color1.h - color2.h) * 0.80;
    const deltaS = (color1.s - color2.s) * 0.80;
    const deltaL = (color1.v - color2.v) * 0.80;

    return Math.sqrt(deltaH * deltaH + deltaS * deltaS + deltaL * deltaL);
}

export function hsvColorDistance(color1, color2) {
    const deltaH = Math.abs(color1.h - color2.h);
    const deltaS = (color1.s - color2.s) / 100;
    const deltaV = (color1.v - color2.v) / 100;

    return Math.sqrt(deltaH * deltaH + deltaS * deltaS + deltaV * deltaV);
}



export function hsvColorDistance2(color1, color2) {
    const deltaH = Math.abs((color1.h - color2.h + 180) % 360 - 180);
    const deltaS = (color1.s - color2.s) / 100;
    const deltaL = (color1.l - color2.l) / 100;

    return Math.sqrt(deltaH * deltaH + deltaS * deltaS + deltaL * deltaL);
}

export function rgb2hsv0(r, g, b){
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h, s, v;

    if (max === min) {
        h = 0;
    } else if (max === r) {
        h = (60 * ((g - b) / delta + 6)) % 360;
    } else if (max === g) {
        h = (60 * ((b - r) / delta + 2)) % 360;
    } else {
        h = (60 * ((r - g) / delta + 4)) % 360;
    }

    if (max === 0) {
    s = 0;
    } else {
    s = (delta / max) * 100;
    }

    v = max * 100;

    return { h, s, v };
}

export function rgb2hsv1 (r, g, b) {
    let rabs, gabs, babs, rr, gg, bb, h, s, v, diff, diffc, percentRoundFn;
    rabs = r / 255;
    gabs = g / 255;
    babs = b / 255;
    v = Math.max(rabs, gabs, babs),
    diff = v - Math.min(rabs, gabs, babs);
    diffc = c => (v - c) / 6 / diff + 1 / 2;
    percentRoundFn = num => Math.round(num * 100) / 100;
    if (diff == 0) {
        h = s = 0;
    } else {
        s = diff / v;
        rr = diffc(rabs);
        gg = diffc(gabs);
        bb = diffc(babs);

        if (rabs === v) {
            h = bb - gg;
        } else if (gabs === v) {
            h = (1 / 3) + rr - bb;
        } else if (babs === v) {
            h = (2 / 3) + gg - rr;
        }
        if (h < 0) {
            h += 1;
        }else if (h > 1) {
            h -= 1;
        }
    }
    return {
        h: Math.round(h * 360),
        s: percentRoundFn(s * 100),
        v: percentRoundFn(v * 100)
    };
}

export function rgb2hsv2(r,g,b) {
    let v=Math.max(r,g,b), c=v-Math.min(r,g,b);
    let h= c && ((v==r) ? (g-b)/c : ((v==g) ? 2+(b-r)/c : 4+(r-g)/c)); 
    return {h:60*(h<0?h+6:h), s:v&&c/v, v:v}
}

export function rgb2hsv3(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g ,b);

    let h, s;
    
    const l = (max + min) / 2;

     if(max === min){
         h = 0;
         s = 0;
     } else {
         const d = max - min;

         switch(max){
             case r: 
                 h = ((g - b) / d + (g < b ?6 :0)) * 60; break;
             case g:
                 h = ((b - r) / d + 2) * 60; break;
             case b:
                 h= ((r - g) / d+4)*60;break;


        }

        s=l > .5?d/(2-max-min):d/(max+min);
      }
   return {h: (Math.round(h)+360)%360, s: Math.round(s*100), v: Math.round(l*100)};
}
export function toRgb(hsv) {
    var d = 0.0166666666666666 * hsv.h;
    var c = hsv.v * hsv.s;
    var x = c - c * Math.abs(d % 2.0 - 1.0);
    var m = hsv.v - c;
    c += m;
    x += m;
    switch (d >>> 0) {
        case 0: return {r: c, g: x, b: m};
        case 1: return {r: x, g: c, b: m};
        case 2: return {r: m, g: c, b: x};
        case 3: return {r: m, g: x, b: c};
        case 4: return {r: x, g: m, b: c};
    }
    return {r: c, g: m, b: x};
}

export function toRgb2(hsv) {
  var rgb = toRgb(hsv);
  return {
      r: Math.round(255 * rgb.r),
      g: Math.round(255 * rgb.g),
      b: Math.round(255 * rgb.b)
  };
}

export function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;
  
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
  
    if (max == min) {
      h = s = 0; // achromatic
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
  
      h /= 6;
    }
  
    return { h, s, v:l };
}

export function rgbaToRgb(rgba) {
    const rgbaComponents = rgba.substring(5, rgba.length - 1).split(',').map(Number);

    const red = Math.round(rgbaComponents[0]);
    const green = Math.round(rgbaComponents[1]);
    const blue = Math.round(rgbaComponents[2]);

    return `rgb(${red}, ${green}, ${blue})`;
}


export function hslToRgb(h, s, l) {
    var r, g, b;
  
    if (s == 0) {
      r = g = b = l; // achromatic
    } else {
      function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      }
  
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
  
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
  
    return [ r * 255, g * 255, b * 255 ];
}  

export function hslToRgb2(h, s, l) {
    h /= 360; // Convert hue to [0, 1]
    s /= 100; // Convert saturation to [0, 1]
    l /= 100; // Convert lightness to [0, 1]

    let r, g, b;

    if (s === 0) {
        r = g = b = l; // Achromatic (gray)
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function hsvToRgb(h, s, v) {
    h = (h % 360 + 360) % 360; // Normalize hue to [0, 359]
    s /= 100; // Convert saturation to [0, 1]
    v /= 100; // Convert value to [0, 1]

    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;

    let r = m;
    let g = m;
    let b = m;

    if (h >= 0 && h < 60) {
        r += c;
        g += x;
    } else if (h >= 60 && h < 120) {
        r += x;
        g += c;
    } else if (h >= 120 && h < 180) {
        g += c;
        b += x;
    } else if (h >= 180 && h < 240) {
        g += x;
        b += c;
    } else if (h >= 240 && h < 300) {
        r += x;
        b += c;
    } else {
        r += c;
        b += x;
    }

    return [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
    ];
}


export function rgbToHsv(r, g, b) {
    r /= 255; // Convert red value to [0, 1]
    g /= 255; // Convert green value to [0, 1]
    b /= 255; // Convert blue value to [0, 1]

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0,
        s = 0,
        v = max;

     if (delta !== 0) {
        s = delta / max;
        
         if (max === r) {
            h = ((g - b) / delta) % 6;
            
         } else if (max === g) {
            h = (b - r) / delta +2;
         
         } else{
             h =(r-g)/delta+4;
             
         }
         
     }

     h *=60 ;
     
      if( h<0){
          h+=360
          
      }
      
      s *=100 ;
      
       v*=100 ;

    
  
   return { 
       h: Math.round(h), 
       s: Math.round(s),
       v: Math.round(v)
   };
}