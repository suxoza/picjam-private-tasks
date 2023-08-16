

export const getImageFileFromUrl = async (imageUrl) => {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const imageName = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
    const imageFile = new File([blob], imageName, { type: blob.type });
    return imageFile;
}

export class ImageColorPicker {
    constructor(canvas, img) {
      this.originalImage = img;
      this.canvas = canvas;
      this.ctx = this.canvas.getContext('2d');
      this.imgW = img.width;
      this.imgH = img.height;
      this.ctx.drawImage(this.originalImage, 0, 0, this.imgW, this.imgH);
      this.imgData = this.ctx.getImageData(0, 0, this.imgW, this.imgH);
    }
}

function dataURItoBlob(dataURI) {
    const mime = dataURI.split(',')[0].split(':')[1].split(';')[0]
    const binary = atob(dataURI.split(',')[1])
    const array = []
    for (let i = 0; i < binary.length; i += 1) {
      array.push(binary.charCodeAt(i))
    }
    return new Blob([new Uint8Array(array)], { type: mime })
}

const ControlNetMethodMap = {
    canny: 'control_v11p_sd15_canny',
    inpaint: 'control_v11p_sd15_inpaint',
    openpose: 'control_v11p_sd15_openpose',
    depth: 'control_v11f1p_sd15_depth',
}

export function loadImage(image, src) {
    return new Promise((resolve, reject) => {
      const initSRC = image.src
      const img = image
      img.onload = resolve
      img.onerror = err => {
        img.src = initSRC
        reject(err)
      }
      img.src = src
    })
  }
  

export async function inpaint(
    imageFile,
    settings,
    croperRect,
    prompt,
    negativePrompt,
    seed,
    maskBase64,
    customMask,
    paintByExampleImage
  ) {
    // 1080, 2000, Original
    const fd = new FormData()
    fd.append('image', imageFile)
    if (maskBase64 !== undefined) {
      fd.append('mask', dataURItoBlob(maskBase64))
    } else if (customMask !== undefined) {
      fd.append('mask', customMask)
    }
  
    console.log('settings j======')
    console.log(settings)
    const hdSettings = settings.hdSettings[settings.model]
    fd.append('ldmSteps', settings.ldmSteps.toString())
    fd.append('ldmSampler', settings.ldmSampler.toString())
    fd.append('zitsWireframe', settings.zitsWireframe.toString())
    fd.append('hdStrategy', hdSettings.hdStrategy)
    fd.append('hdStrategyCropMargin', hdSettings.hdStrategyCropMargin.toString())
    fd.append(
      'hdStrategyCropTrigerSize',
      hdSettings.hdStrategyCropTrigerSize.toString()
    )
    fd.append(
      'hdStrategyResizeLimit',
      hdSettings.hdStrategyResizeLimit.toString()
    )
  
    fd.append('prompt', prompt === undefined ? '' : prompt)
    fd.append(
      'negativePrompt',
      negativePrompt === undefined ? '' : negativePrompt
    )
    fd.append('croperX', croperRect.x.toString())
    fd.append('croperY', croperRect.y.toString())
    fd.append('croperHeight', croperRect.height.toString())
    fd.append('croperWidth', croperRect.width.toString())
    fd.append('useCroper', settings.showCroper ? 'true' : 'false')
  
    fd.append('sdMaskBlur', settings.sdMaskBlur.toString())
    fd.append('sdStrength', settings.sdStrength.toString())
    fd.append('sdSteps', settings.sdSteps.toString())
    fd.append('sdGuidanceScale', settings.sdGuidanceScale.toString())
    fd.append('sdSampler', settings.sdSampler.toString())
    fd.append('sdSeed', seed ? seed.toString() : '-1')
    fd.append('sdMatchHistograms', settings.sdMatchHistograms ? 'true' : 'false')
    fd.append('sdScale', (settings.sdScale / 100).toString())
  
    fd.append('cv2Radius', settings.cv2Radius.toString())
    fd.append('cv2Flag', settings.cv2Flag.toString())
  
    fd.append('paintByExampleSteps', settings.paintByExampleSteps.toString())
    fd.append(
      'paintByExampleGuidanceScale',
      settings.paintByExampleGuidanceScale.toString()
    )
    fd.append('paintByExampleSeed', seed ? seed.toString() : '-1')
    fd.append(
      'paintByExampleMaskBlur',
      settings.paintByExampleMaskBlur.toString()
    )
    fd.append(
      'paintByExampleMatchHistograms',
      settings.paintByExampleMatchHistograms ? 'true' : 'false'
    )
    if (paintByExampleImage) {
      fd.append('paintByExampleImage', paintByExampleImage)
    }
  
    fd.append('p2pSteps', settings.p2pSteps.toString())
    fd.append('p2pImageGuidanceScale', settings.p2pImageGuidanceScale.toString())
    fd.append('p2pGuidanceScale', settings.p2pGuidanceScale.toString())
  
    fd.append(
      'controlnet_conditioning_scale',
      settings.controlnetConditioningScale.toString()
    )
    fd.append(
      'controlnet_method',
      ControlNetMethodMap[settings.controlnetMethod.toString()]
    )
  
    try {
    //   const API_URL = 'http://192.168.100.11:8181'
      const API_URL = 'http://localhost:8181'
      const res = await fetch(`${API_URL}/inpaint`, {
        method: 'POST',
        body: fd,
      })
      if (res.ok) {
        const blob = await res.blob()
        const newSeed = res.headers.get('x-seed')
        return { blob: URL.createObjectURL(blob), seed: newSeed }
      }
      const errMsg = await res.text()
      throw new Error(errMsg)
    } catch (error) {
      throw new Error(`Something went wrong: ${error}`)
    }
  }