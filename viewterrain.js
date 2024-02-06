//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gRotations = [[1.0, 0.0], [0.0, -1.0], [-1.0, 0.0], [0.0, 1.0]]

function checkCompleteness() {
	var loadingImages = terrainView.loadingImages
	for (var loadingImageIndex = loadingImages.length - 1; loadingImageIndex > -1; loadingImageIndex--) {
		var loadingImage = loadingImages[loadingImageIndex]
		if (loadingImage.complete) {
			loadingImages.splice(loadingImageIndex, 1)
		}
	}
	if (loadingImages.length == 0) {
		terrainView.draw()
	}
}

function drawTerrain() {
	terrainView.timeout = undefined
	if (terrainView.loadingImages.length > 0) {
		terrainView.draw()
	}
}

function pixelSelectChanged() {
	var pixelSelect = document.getElementById(terrainView.pixelSelectID)
	terrainView.setPixel(pixelSelect.selectedIndex)
	terrainView.draw()
}

function scaleSelectChanged() {
	var scaleSelect = document.getElementById(terrainView.scaleSelectID)
	terrainView.scaleSelectedIndex = scaleSelect.selectedIndex
	terrainView.draw()
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
		var option = undefined
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

function viewMouseDown(event) {
	terrainView.mouseDown(event)
}

var terrainView = {
	draw: function() {
		console.log(this.location)
		var childrenMap = undefined
		var childrenMaps = this.region.childrenMaps
		if (this.region.childrenMaps.length > this.scaleSelectedIndex) {
			childrenMap = this.region.childrenMaps[this.scaleSelectedIndex]
		}
		var locationAtScale = this.terrain.getLocationAtScale(this.location, this.scaleSelectedIndex)
		var screenXY = [this.pixelBeginX, null]
		for (; screenXY[0] < this.pixelEndX; screenXY[0] += 1) {
			for (screenXY[1] = this.pixelBeginY; screenXY[1] < this.pixelEndY; screenXY[1] += 1) {
				var screenLocation = getAddition2D(locationAtScale, screenXY)
				var pixelSlides = this.terrain.getPixelSlides(this.scaleSelectedIndex, this.pixelMultiplier, screenLocation, screenXY)
				for (var pixelSlide of pixelSlides) {
					if (pixelSlide.startsWith('#')) {
						this.drawRectangleByScreenXY(pixelSlide, screenXY)
					}
					else {
						this.drawImageByScreenXY(pixelSlide, screenXY)
					}
				}
				var boundingBox = []
				var scaleLocation = screenLocation.slice(0)
				for (var scaleIndex = this.scaleSelectedIndex; scaleIndex < childrenMaps.length; scaleIndex++) {
					var childrenMap = childrenMaps[scaleIndex]
					var xyKey = scaleLocation[0].toString() + ',' + scaleLocation[1].toString()
					if (childrenMap.has(xyKey)) {
						var children = childrenMap.get(xyKey)
						for (var child of children) {
							var childLocation = child.location
							if (boundingBox.length == 0) {
								var scaleMultiplier = this.terrain.scaleMultipliers[this.scaleSelectedIndex]
								var topLeft = getMultiplication2DScalar(screenLocation, scaleMultiplier)
								var bottomRight = getAddition2D(topLeft, [scaleMultiplier, scaleMultiplier])
								boundingBox = [topLeft, bottomRight]
							}
							if (isPointInsideBoundingBox(boundingBox, childLocation)) {
								if (this.pixelMultiplier == 1) {
									this.drawImageByScreenXY(child.filename, screenXY)
								}
								else {
									this.drawRectangleByScreenXY(child.color, screenXY)
								}
							}
						}
					}
					scaleLocation[0] = Math.floor(0.5 * scaleLocation[0] + 0.000001)
					scaleLocation[1] = Math.floor(0.5 * scaleLocation[1] + 0.000001)
				}
			}
		}
		for (var sideArrow of this.sideArrows) {
			this.pathByPolygon(sideArrow)
			this.drawPath()
		}
	},
	drawImage: function(source, x, y) {
		var image = undefined
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
			if (this.timeout == undefined) {
				this.timeout = true
				this.loadingImages.push(image)
				setTimeout(drawTerrain, 1000)
				image.onload = checkCompleteness
			}
		}
	},
	drawImageByScreenXY: function(filename, screenXY) {
		var x = this.pixelCorner[0] + screenXY[0] * this.imageHeight
		var y = this.pixelCorner[1] - screenXY[1] * this.imageHeight
		this.drawImage(filename, x, y)
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
	initialize: function() {
		this.imageHeight = 64
		this.halfImageHeight = this.imageHeight / 2
		this.imageMap = new Map()
		this.location = [0, 0]
		this.loadingImages = []
		this.numberOfScales = 9
		this.pixelMultiplier = 1
		this.pixelMultiplierStrings = ['x1 (Default)', 'x2', 'x4', 'x8', 'x16', 'x32', 'x64']
		this.pixelSelectedIndex = 0
		this.scales = new Array(this.numberOfScales)
		this.scaleSelectedIndex = 0
		this.scaleStrings = new Array(this.numberOfScales)
		this.selectedRegion = undefined
		var scale = 1
		for (var scaleIndex = 0; scaleIndex < this.numberOfScales; scaleIndex++) {
			this.scales[scaleIndex] = scale
			this.scaleStrings[scaleIndex] = '1 pixel : ' + scale.toString() + ' km'
			scale += scale
		}
		this.textHeight = 12
		this.textSpace = this.textHeight * 3 / 2
		this.textSpaceMinus = this.textSpace - 2
		this.timeout = undefined
		this.doubleTextSpace = this.textSpace + this.textSpace
	},
	lineToXY: function(xy) {
		this.context.lineTo(xy[0], xy[1])
	},
	mouseDown: function(event) {
		if (this.region == undefined) {
			return
		}
		for (var sideArrowIndex = 0; sideArrowIndex < 4; sideArrowIndex++) {
			this.pathByPolygon(this.sideArrows[sideArrowIndex])
			if (this.context.isPointInPath(event.offsetX, event.offsetY)) {
				var rotationMultiplied = getMultiplication2DScalar(gRotations[sideArrowIndex], this.pixelMultiplier)
				multiply2DScalar(rotationMultiplied, this.terrain.scaleMultipliers[this.scaleSelectedIndex])
				add2D(this.location, rotationMultiplied)
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
		divide2DScalar(increment, this.imageHeight / this.pixelMultiplier)
		increment[0] = Math.floor(increment[0])
		increment[1] = Math.ceil(increment[1])
		multiply2DScalar(increment, this.terrain.scaleMultipliers[this.scaleSelectedIndex])
		add2D(this.location, increment)
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
			this.canvas.addEventListener('mousedown', viewMouseDown)
//			this.canvas.addEventListener('mousemove', viewMouseMove)
//			this.canvas.addEventListener('mouseout', viewMouseOut)
//			this.canvas.addEventListener('mouseup', viewMouseUp)
		}
		this.imageMap.clear()
		this.loadingImages.length = 0
		this.objectMap = objectMap
		this.pixelSelectID = pixelSelectID
		this.region = undefined
		this.scaleSelectID = scaleSelectID
		this.view = undefined
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
		if (this.region == undefined) {
			return
		}
		this.location = this.region.entry.slice(0)
		this.terrain = this.region.terrain
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
			this.sideArrows[polygonIndex] = add2Ds(getRotation2DsVector(sideArrow, [rotation[0], -rotation[1]]), this.canvasCenter)
		}
		setPixelSelect(this.pixelMultiplierStrings, this.pixelSelectedIndex, this.pixelSelectID)
		setScaleSelect(this.scaleStrings, this.scaleSelectedIndex, this.scaleSelectID)
		this.setPixel(this.pixelSelectedIndex)
		this.draw()
	}
}

function Terrain(terrainString) {
	this.childrenMaps = []
	this.terrainMap = new Map()
	this.terrainString = terrainString
	this.circumference = 40960
	this.extraWater = 3500.0
	this.numberOfTerrainScales = 13
	this.objectTypeMap = new Map([['d', ['#ebaf4c', 'beehive.png']], ['h', ['#ffa500', 'red_dragon_welsh.png']]])
	this.selectedRegion = undefined
	this.altitudeMultipliers = new Array(this.numberOfTerrainScales)
	this.circumferences = new Array(this.numberOfTerrainScales)
	this.scaleMultipliers = new Array(this.numberOfTerrainScales)
	this.terrainMaps = new Array(this.numberOfTerrainScales)
	this.temperatureMultipliers = new Array(this.numberOfTerrainScales)
	this.wetnessMultipliers = new Array(this.numberOfTerrainScales)
	var scaleMultiplier = 1
	var circumference = this.circumference
	for (var terrainScaleIndex = 0; terrainScaleIndex < this.numberOfTerrainScales; terrainScaleIndex++) {
		this.altitudeMultipliers[terrainScaleIndex] = 100.0 * Math.pow(scaleMultiplier, 0.7)
		this.circumferences[terrainScaleIndex] = circumference
		this.scaleMultipliers[terrainScaleIndex] = scaleMultiplier
		this.terrainMaps[terrainScaleIndex] = new Map()
		this.temperatureMultipliers[terrainScaleIndex] = 0.00015 * Math.pow(scaleMultiplier, 1.6)
//			this.wetnessMultipliers[terrainScaleIndex] = 1.0
		this.wetnessMultipliers[terrainScaleIndex] = Math.pow(scaleMultiplier, -0.02)
		circumference /= 2
		scaleMultiplier += scaleMultiplier
	}
	this.getLocationAtScale = function(location, scaleIndex) {
		var scaleMultiplier = this.scaleMultipliers[scaleIndex]
		return [Math.floor(location[0] / scaleMultiplier), Math.floor(location[1] / scaleMultiplier)]
	}
	this.getPixelSlides = function(depth, pixelMultiplier, screenLocation, screenXY) {
		var terrainParameters = this.getTerrainParameters(screenLocation, depth)
		var altitude = terrainParameters[0]
		var altitudeTemperature = terrainParameters[1] - 0.003 * Math.max(altitude, 0.0)
		if (altitudeTemperature < -12.0) {
			return ['#fdfdff']
		}
		if (altitude < 0.0) {
			return ['#0000ff']
		}
		if (altitudeTemperature < 0.0) {
			return ['#f0f0f0']
		}
		var pixelSlides = ['#ffff00']
		if (terrainParameters[2] > 0.0) {
			pixelSlides[0] = '#00ff00'
		}
		if (terrainParameters.length > 3) {
			var objectViews = this.objectTypeMap.get(terrainParameters[3][2])
			if (pixelMultiplier == 1) {
				pixelSlides.push(objectViews[1])
				return pixelSlides
			}
			return [objectViews[0]]
		}
		return pixelSlides
	}
	this.getTerrainParameters = function(screenLocation, terrainScaleIndex) {
		if (terrainScaleIndex == this.numberOfTerrainScales) {
			return undefined
		}
		var terrainMap = this.terrainMaps[terrainScaleIndex]
		var depthCircumference = this.circumferences[terrainScaleIndex]
		screenLocation[0] = (screenLocation[0] + depthCircumference) % depthCircumference
		var xyKey = screenLocation[0].toString() + ',' + screenLocation[1].toString()
		if (terrainMap.has(xyKey)) {
			return terrainMap.get(xyKey)
		}
		var depthKey = xyKey + 'd' + terrainScaleIndex.toString()
		var terrainParameters = [getHashCubed(depthKey + 'a'), getHashCubed(depthKey + 't'), getHashCubed(depthKey + 'w')]
		terrainParameters[0] *= this.altitudeMultipliers[terrainScaleIndex]
		terrainParameters[1] *= this.temperatureMultipliers[terrainScaleIndex]
		terrainParameters[2] *= this.wetnessMultipliers[terrainScaleIndex]
		var nextDepth = terrainScaleIndex + 1
		if (nextDepth < this.numberOfTerrainScales) {
			var halfX = 0.5 * screenLocation[0] + 0.000001
			var nextParcelX = Math.floor(halfX)
			var minorParcelX = Math.floor(halfX + 0.5)
			if (minorParcelX == nextParcelX) {
				minorParcelX = nextParcelX - 1
			}
			var halfY = 0.5 * screenLocation[1] + 0.000001
			var nextParcelY = Math.floor(halfY)
			var minorParcelY = Math.floor(halfY + 0.5)
			if (minorParcelY == nextParcelY) {
				minorParcelY = nextParcelY - 1
			}
			var centerParameters = this.getTerrainParameters([nextParcelX, nextParcelY], nextDepth)
			var nextParameters = getMultiplication3DScalar(centerParameters, 9.0)
			var minorParameters = getMultiplication3DScalar(this.getTerrainParameters([minorParcelX, nextParcelY], nextDepth), 3.0)
			add3D(nextParameters, minorParameters)
			var minorParameters = getMultiplication3DScalar(this.getTerrainParameters([nextParcelX, minorParcelY], nextDepth), 3.0)
			add3D(nextParameters, minorParameters)
			add3D(nextParameters, this.getTerrainParameters([minorParcelX, minorParcelY], nextDepth))
			multiply3DScalar(nextParameters, 1.0 / 16.0)
			add3D(terrainParameters, nextParameters)
			for (var centerParameterIndex = 3; centerParameterIndex < centerParameters.length; centerParameterIndex++) {
				var centerParameter = centerParameters[centerParameterIndex]
				var scaleMultiplier = this.scaleMultipliers[terrainScaleIndex]
				var beginX = scaleMultiplier * screenLocation[0]
				if (centerParameter[0] >= beginX && centerParameter[0] < (beginX + scaleMultiplier)) {
					var beginY = scaleMultiplier * screenLocation[1]
					if (centerParameter[1] >= beginY && centerParameter[1] < (beginY + scaleMultiplier)) {
						terrainParameters.push(centerParameter)
					}
				}
			}
		}
		else {
			terrainParameters[0] -= this.extraWater
			terrainParameters[1] = 17.0 - 7.0 * Math.pow(Math.abs(screenLocation[1] + 0.5), 2.0)

		}
		if (terrainScaleIndex == 2) {
			if (getHashFloat(depthKey + 'v') < 0.1) {
				var scaleMultiplier = this.scaleMultipliers[terrainScaleIndex]
				var objectType = 'd'
				if (getHashFloat('o' + depthKey) > 0.5) {
					objectType = 'h'
				}
				var x = getHashInt(scaleMultiplier, depthKey + 'x') + scaleMultiplier * screenLocation[0]
				var y = getHashInt(scaleMultiplier, 'y' + depthKey) + scaleMultiplier * screenLocation[1]
				terrainParameters.push([x, y, objectType])
			}
		}
		terrainMap.set(xyKey, terrainParameters)
		return terrainParameters
	}
}


terrainView.initialize()
