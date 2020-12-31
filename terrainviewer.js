//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gRotations = [[1.0, 0.0], [0.0, -1.0], [-1.0, 0.0], [0.0, 1.0]]

function checkCompleteness() {
	var loadingImages = terrainViewer.loadingImages
	for (var loadingImageIndex = loadingImages.length - 1; loadingImageIndex > -1; loadingImageIndex--) {
		var loadingImage = loadingImages[loadingImageIndex]
		if (loadingImage.complete) {
			loadingImages.splice(loadingImageIndex, 1)
		}
	}
	if (loadingImages.length == 0) {
		terrainViewer.draw()
	}
}

function drawTerrain() {
	terrainViewer.timeout = null
	if (terrainViewer.loadingImages.length > 0) {
		terrainViewer.draw()
	}
}

function pixelSelectChanged() {
	var pixelSelect = document.getElementById(terrainViewer.pixelSelectID)
	terrainViewer.setPixel(pixelSelect.selectedIndex)
	terrainViewer.draw()
}

function scaleSelectChanged() {
	var scaleSelect = document.getElementById(terrainViewer.scaleSelectID)
	terrainViewer.scaleSelectedIndex = scaleSelect.selectedIndex
	terrainViewer.draw()
}

function setPixelSelect(pixelMultiplierStrings, pixelSelectedIndex, pixelSelectID) {
	var pixelSelect = document.getElementById(pixelSelectID)
	setSelectOptions(pixelSelect, pixelMultiplierStrings)
	pixelSelect.selectedIndex = pixelSelectedIndex
}

function setScaleSelect(scaleStrings, scaleSelectedIndex, scaleSelectID) {
	var scaleSelect = document.getElementById(scaleSelectID)
	setSelectOptions(scaleSelect, scaleStrings)
	scaleSelect.selectedIndex = scaleSelectedIndex
}

function setSelectOptions(select, selectStrings) {
	var options = select.options
	for (var optionIndex = 0; optionIndex < selectStrings.length; optionIndex++) {
		var selectString = selectStrings[optionIndex]
		var option = null
		if (optionIndex >= options.length) {
			option = document.createElement('option')
			select.add(option)
		}
		else {
			option = options[optionIndex]
		}
		option.text = selectString
	}
}

function viewerMouseDown(event) {
	terrainViewer.mouseDown(event)
}
/*
function viewerMouseMove(event) {
//	terrainViewer.mouseMoved(event)
}

function viewerMouseOut(event) {
	terrainViewer.mouseDown = null
	if (terrainViewer.view == null) {
		return
	}
	terrainViewer.view.rotationMatrix = terrainViewer.view.lastRotationMatrix
	terrainViewer.draw()
}

function viewerMouseUp(event) {
	terrainViewer.mouseDown = null
	if (terrainViewer.view == null) {
		return
	}
	terrainViewer.mouseMoved(event)
	terrainViewer.view.lastRotationMatrix = terrainViewer.view.rotationMatrix
	terrainViewer.drawModelControlPath(event)
}
*/
var terrainViewer = {
	addMesh: function(id, matrix3D) {
		this.views.push({id:id, matrix3D:matrix3D, rotationMatrix:null})
	},
	beginModelCirclePath: function() {
		this.context.beginPath()
		this.context.arc(this.halfWidth, this.halfHeight, this.modelRadiusCircle, 0, Math.PI + Math.PI)
	},
	beginModelRingPath: function() {
		this.context.beginPath()
		this.context.moveTo(this.halfWidth + this.modelRadiusRing, this.halfHeight)
		this.context.arc(this.halfWidth, this.halfHeight, this.modelRadiusRing, 0, Math.PI + Math.PI)
		this.context.moveTo(this.halfWidth + this.modelRadiusCircle, this.halfHeight)
		this.context.arc(this.halfWidth, this.halfHeight, this.modelRadiusCircle, Math.PI + Math.PI, 0, true)
		this.context.closePath()
	},
	draw: function() {
		console.log(this.location)
		for (var pixelX = this.pixelBeginX; pixelX < this.pixelEndX; pixelX++) {
			for (var pixelY = this.pixelBeginY; pixelY < this.pixelEndY; pixelY++) {
				var objectViews = this.drawTerrain(this.scaleSelectedIndex, [pixelX, pixelY])
				if (objectViews != null) {
					this.drawImageByScreenXY([pixelX, pixelY], objectViews[1])
				}
			}
		}
		if (this.pixelMultiplier == 1) {
			this.drawImageByScreenXY([0, 0], 'delfador.png')
		}
		for (var sideArrow of this.sideArrows) {
			this.pathByPolygon(sideArrow)
			this.drawPath()
		}
	},
	drawImage: function(source, x, y) {
		var image = null
		if (this.imageMap.has(source)) {
			image = this.imageMap.get(source)
		}
		else {
			image = new Image()
			image.src = source
			this.imageMap.set(source, image)
		}
		if (image.complete) {
			this.context.drawImage(image, x, y)
		}
		else {
			if (this.timeout == null) {
				this.timeout = true
				this.loadingImages.push(image)
				setTimeout(drawTerrain, 1000)
				image.onload = checkCompleteness
			}
		}
	},
	drawImageByScreenXY: function(screenXY, source) {
		var x = this.pixelCorner[0] + screenXY[0] * this.imageHeight
		var y = this.pixelCorner[1] - screenXY[1] * this.imageHeight
		this.drawImage(source, x, y)
	},
	drawModelControlPath: function(event) {
		this.beginModelCirclePath()
		if (this.context.isPointInPath(event.offsetX, event.offsetY)) {
			this.beginModelRingPath()
			this.erasePath()
			this.beginModelCirclePath()
			this.drawPath()
			return
		}
		this.beginModelRingPath()
		if (this.context.isPointInPath(event.offsetX, event.offsetY)) {
			this.drawPath()
			return
		}
		this.erasePath()
	},
	drawPath: function() {
		this.context.lineWidth = 1
		this.context.strokeStyle = 'black'
		this.context.stroke()
	},
	drawRectangleByScreenXY: function(color, screenXY) {
		var x = this.pixelCorner[0] + screenXY[0] * this.terrainHeight
		var y = this.pixelCorner[1] - screenXY[1] * this.terrainHeight
		this.context.fillStyle = color
		this.context.fillRect(x, y, this.terrainHeight, this.terrainHeight)
	},
	drawTerrain: function(depth, screenXY) {
		var depthMultiplier = this.depthMultipliers[depth]
		var locationAtAdepth = [Math.floor(this.location[0] / depthMultiplier), Math.floor(this.location[1] / depthMultiplier)]
		var terrainParameters = this.getTerrainParameters(depth, getXYAddition(locationAtAdepth, screenXY))
		var altitude = terrainParameters[0]
		var altitudeTemperature = terrainParameters[1] - 0.003 * Math.max(altitude, 0.0)
		if (altitudeTemperature < -12.0) {
			this.drawRectangleByScreenXY('#fdfdff', screenXY)
			return null
		}
		if (altitude < 0.0) {
			this.drawRectangleByScreenXY('#0000ff', screenXY)
			return null
		}
		if (altitudeTemperature < 0.0) {
//			this.drawRectangleByScreenXY('#f0f000', screenXY)
			this.drawRectangleByScreenXY('#f0f0f0', screenXY)
			return null
		}
		var objectViews = null
		if (terrainParameters.length > 3) {
			var objectViews = this.objectTypeMap.get(terrainParameters[3][2])
			if (this.pixelMultiplier != 1) {
				this.drawRectangleByScreenXY(objectViews[0], screenXY)
				return null
			}
		}
		if (terrainParameters[2] > 0.0) {
			this.drawRectangleByScreenXY('#00ff00', screenXY)
			return objectViews
		}
		this.drawRectangleByScreenXY('#ffff00', screenXY)
		return objectViews
	},
	erasePath: function() {
		this.context.lineWidth = 3
		this.context.strokeStyle = 'white'
		this.context.stroke()
	},
	getOffsetNormal: function(event) {
		return normalizeXY([event.offsetX - this.halfWidth, event.offsetY - this.halfHeight])
	},
	getTerrainParameters: function(depthIndex, parcelXY) {
		if (depthIndex == this.numberOfDepths) {
			return null
		}
		var terrainMap = this.terrainMaps[depthIndex]
		var depthCircumference = this.circumferences[depthIndex]
		parcelXY[0] = (parcelXY[0] + depthCircumference) % depthCircumference
		var xyKey = parcelXY[0].toString() + 'y' + parcelXY[1].toString()
		if (terrainMap.has(xyKey)) {
			return terrainMap.get(xyKey)
		}
		var depthKey = xyKey + 'd' + depthIndex.toString()
		var terrainParameters = [getHashCubed(depthKey + 'a'), getHashCubed(depthKey + 't'), getHashCubed(depthKey + 'w')]
		terrainParameters[0] *= this.altitudeMultipliers[depthIndex]
		terrainParameters[1] *= this.temperatureMultipliers[depthIndex]
		terrainParameters[2] *= this.wetnessMultipliers[depthIndex]
		var nextDepth = depthIndex + 1
		if (nextDepth < this.numberOfDepths) {
			var halfX = 0.5 * parcelXY[0] + 0.000001
			var nextParcelX = Math.floor(halfX)
			var minorParcelX = Math.floor(halfX + 0.5)
			if (minorParcelX == nextParcelX) {
				minorParcelX = nextParcelX - 1
			}
			var halfY = 0.5 * parcelXY[1] + 0.000001
			var nextParcelY = Math.floor(halfY)
			var minorParcelY = Math.floor(halfY + 0.5)
			if (minorParcelY == nextParcelY) {
				minorParcelY = nextParcelY - 1
			}
			var centerParameters = this.getTerrainParameters(nextDepth, [nextParcelX, nextParcelY])
			var nextParameters = getXYZMultiplicationByScalar(centerParameters, 9.0)
			var minorParameters = getXYZMultiplicationByScalar(this.getTerrainParameters(nextDepth, [minorParcelX, nextParcelY]), 3.0)
			addXYZ(nextParameters, minorParameters)
			var minorParameters = getXYZMultiplicationByScalar(this.getTerrainParameters(nextDepth, [nextParcelX, minorParcelY]), 3.0)
			addXYZ(nextParameters, minorParameters)
			addXYZ(nextParameters, this.getTerrainParameters(nextDepth, [minorParcelX, minorParcelY]))
			multiplyXYZByScalar(nextParameters, 1.0 / 16.0)
			addXYZ(terrainParameters, nextParameters)
			for (var centerParameterIndex = 3; centerParameterIndex < centerParameters.length; centerParameterIndex++) {
				var centerParameter = centerParameters[centerParameterIndex]
				var depthMultiplier = this.depthMultipliers[depthIndex]
				var beginX = depthMultiplier * parcelXY[0]
				if (centerParameter[0] >= beginX && centerParameter[0] < (beginX + depthMultiplier)) {
					var beginY = depthMultiplier * parcelXY[1]
					if (centerParameter[1] >= beginY && centerParameter[1] < (beginY + depthMultiplier)) {
						terrainParameters.push(centerParameter)
					}
				}
			}
		}
		else {
			terrainParameters[0] -= this.extraWater
			terrainParameters[1] = 17.0 - 7.0 * Math.pow(Math.abs(parcelXY[1] + 0.5), 2.0)

		}
		if (depthIndex == 2) {
			if (getHashFloat(depthKey + 'v') < 0.1) {
				var depthMultiplier = this.depthMultipliers[depthIndex]
				var objectType = 'd'
				if (getHashFloat('o' + depthKey) > 0.5) {
					objectType = 'h'
				}
				var x = getHashInt(depthMultiplier, depthKey + 'x') + depthMultiplier * parcelXY[0]
				var y = getHashInt(depthMultiplier, 'y' + depthKey) + depthMultiplier * parcelXY[1]
				terrainParameters.push([x, y, objectType])
			}
		}
		terrainMap.set(xyKey, terrainParameters)
		return terrainParameters
	},
	initialize: function() {
		this.canvasID = null
		this.circumference = 40960
		this.extraWater = 3500.0
		this.imageHeight = 64
		this.halfImageHeight = this.imageHeight / 2
		this.imageMap = new Map()
		this.location = [0, 0]
		this.loadingImages = []
		this.numberOfDepths = 13
		this.numberOfScales = 9
		this.objectTypeMap = new Map([['d', ['#ebaf4c', 'beehive.png']], ['h', ['#ffa500', 'reddragonwelsh.png']]])
		this.pixelMultiplier = 1
		this.pixelMultiplierStrings = ['x1 (Default)', 'x2', 'x4', 'x8', 'x16', 'x32', 'x64']
		this.pixelSelectedIndex = 0
		this.scales = new Array(this.numberOfScales)
		this.scaleSelectedIndex = 0
		this.scaleStrings = new Array(this.numberOfScales)
		this.selectedRegion = null
		this.altitudeMultipliers = new Array(this.numberOfDepths)
		this.circumferences = new Array(this.numberOfDepths)
		this.depthMultipliers = new Array(this.numberOfDepths)
		this.terrainMaps = new Array(this.numberOfDepths)
		this.temperatureMultipliers = new Array(this.numberOfDepths)
		this.wetnessMultipliers = new Array(this.numberOfDepths)
		var depthMultiplier = 1
		var circumference = this.circumference
		for (var depthIndex = 0; depthIndex < this.numberOfDepths; depthIndex++) {
			this.altitudeMultipliers[depthIndex] = 100.0 * Math.pow(depthMultiplier, 0.7)
			this.circumferences[depthIndex] = circumference
			this.depthMultipliers[depthIndex] = depthMultiplier
			this.terrainMaps[depthIndex] = new Map()
			this.temperatureMultipliers[depthIndex] = 0.00015 * Math.pow(depthMultiplier, 1.6)
//			this.wetnessMultipliers[depthIndex] = 1.0
			this.wetnessMultipliers[depthIndex] = Math.pow(depthMultiplier, -0.02)
			circumference /= 2
			depthMultiplier += depthMultiplier
		}
		var scale = 1
		for (var scaleIndex = 0; scaleIndex < this.numberOfScales; scaleIndex++) {
			this.scales[scaleIndex] = scale
			this.scaleStrings[scaleIndex] = '1 pixel : ' + scale.toString() + ' km'
			scale += scale
		}
		this.textHeight = 12
		this.textSpace = this.textHeight * 3 / 2
		this.textSpaceMinus = this.textSpace - 2
		this.timeout = null
		this.doubleTextSpace = this.textSpace + this.textSpace
	},
	lineToXY: function(xy) {
		this.context.lineTo(xy[0], xy[1])
	},
	mouseDown: function(event) {
		if (this.region == null) {
			return
		}
		for (var sideArrowIndex = 0; sideArrowIndex < 4; sideArrowIndex++) {
			this.pathByPolygon(this.sideArrows[sideArrowIndex])
			if (this.context.isPointInPath(event.offsetX, event.offsetY)) {
				var rotationMultiplied = getXYMultiplicationByScalar(gRotations[sideArrowIndex], this.pixelMultiplier)
				multiplyXYByScalar(rotationMultiplied, this.depthMultipliers[this.scaleSelectedIndex])
				addXY(this.location, rotationMultiplied)
				this.draw()
				return
			}
		}
		if (event.offsetX <= this.textSpace || event.offsetX >= this.screenRight) {
			return
		}
		if (event.offsetY <= this.textSpace || event.offsetY >= this.screenBottom) {
			return
		}
		var increment = [event.offsetX - this.pixelCorner[0], this.pixelCorner[1] - event.offsetY]
		divideXYByScalar(increment, this.imageHeight / this.pixelMultiplier)
		increment[0] = Math.floor(increment[0])
		increment[1] = Math.ceil(increment[1])
		multiplyXYByScalar(increment, this.depthMultipliers[this.scaleSelectedIndex])
//		multiplyXYByScalar(increment, )
		addXY(this.location, increment)
		this.draw()
	},
	moveToXY: function(xy) {
		this.context.moveTo(xy[0], xy[1])
	},
	pathByPolygon: function(polygon) {
		if (polygon.length == 0) {
			return
		}
		this.context.beginPath()
		this.context.moveTo(polygon[0][0], polygon[0][1])
		for (var pointIndex = 1; pointIndex < polygon.length; pointIndex++) {
			this.context.lineTo(polygon[pointIndex][0], polygon[pointIndex][1])
		}
		this.context.closePath()
	},
	setID: function(canvasID, objectMap, pixelSelectID, scaleSelectID) {
		if (canvasID != this.canvasID) {
			this.canvasID = canvasID
			this.canvas = document.getElementById(canvasID)
			this.canvas.addEventListener('mousedown', viewerMouseDown)
//			this.canvas.addEventListener('mousemove', viewerMouseMove)
//			this.canvas.addEventListener('mouseout', viewerMouseOut)
//			this.canvas.addEventListener('mouseup', viewerMouseUp)
		}
		this.imageMap.clear()
		this.loadingImages.length = 0
		this.objectMap = objectMap
		this.pixelSelectID = pixelSelectID
		this.region = null
		this.scaleSelectID = scaleSelectID
		this.view = null
		this.views = []
	},
	setPixel: function(pixelSelectedIndex) {
		var pixelMultiplierString = this.pixelMultiplierStrings[pixelSelectedIndex]
		this.pixelMultiplier = parseInt(pixelMultiplierString.slice(1).split(' ')[0])
		this.pixelSelectedIndex = pixelSelectedIndex
		this.terrainHeight = this.imageHeight / this.pixelMultiplier
		var multipliedHeight = this.pixelHeight * this.pixelMultiplier
		var multipliedWidth = multipliedHeight
		this.pixelBeginY = -Math.floor(multipliedHeight / 2)
		this.pixelBeginX = -Math.floor(multipliedWidth / 2)
		this.pixelEndX = this.pixelBeginX + multipliedWidth
		this.pixelEndY = this.pixelBeginY + multipliedHeight
		var pixelEndYMinus = this.pixelEndY - 1
		this.pixelCorner = [this.textSpace - this.pixelBeginX * this.terrainHeight, this.textSpace + pixelEndYMinus * this.terrainHeight]
	},
	start: function(height, selectedRegion) {
		this.pixelHeight = Math.floor((height - this.doubleTextSpace) / this.imageHeight)
		this.pixelWidth = this.pixelHeight
		height = this.pixelHeight * this.imageHeight
		this.canvas.height = height + this.doubleTextSpace
		this.canvas.width = this.canvas.height
		if (this.region == null) {
			return
		}
		this.location = this.region.entry.slice(0)
		this.context = this.canvas.getContext('2d')
		this.context.fillStyle = 'white'
		this.context.lineJoin = 'round'
		this.halfHeight = this.canvas.height / 2
		this.halfWidth = this.canvas.width / 2
		this.canvasCenter = [this.halfWidth, this.halfHeight]
		this.screenRight = this.canvas.width - this.textSpace
		this.screenBottom = this.canvas.height - this.textSpace
		var borderRightInnerX = this.halfWidth - this.textSpaceMinus
		var rightArrowInnerTop = -this.doubleTextSpace
		var borderRightOuterX = this.halfWidth - 2
		var rightArrowOuterTop = -this.textSpace
		var rightArrowOuterBottom = this.textSpace
		var rightArrowInnerBottom = this.doubleTextSpace
		var sideArrow = [
			[borderRightInnerX, rightArrowInnerTop],
			[borderRightOuterX, rightArrowOuterTop],
			[borderRightOuterX, rightArrowOuterBottom],
			[borderRightInnerX, rightArrowInnerBottom]]
		this.sideArrows = new Array(4)
		for (var polygonIndex = 0; polygonIndex < 4; polygonIndex++) {
			var rotation = gRotations[polygonIndex]
			this.sideArrows[polygonIndex] = addXYsByXY(getXYRotations(sideArrow, [rotation[0], -rotation[1]]), this.canvasCenter)
		}
		setPixelSelect(this.pixelMultiplierStrings, this.pixelSelectedIndex, this.pixelSelectID)
		setScaleSelect(this.scaleStrings, this.scaleSelectedIndex, this.scaleSelectID)
		this.setPixel(this.pixelSelectedIndex)
		this.draw()
	}
}

terrainViewer.initialize()
