//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function drawFractal2D(control, viewer) {
	var context = viewBroker.context
	var viewFractal2D = viewBroker.viewFractal2D
	var boundingBox = control.boundingBox
	clearBoundingBoxClip(boundingBox, context)
	var redFrequency = Math.exp(viewFractal2D.redControl.value)
	var greenFrequency = Math.exp(viewFractal2D.greenControl.value)
	var blueFrequency = Math.exp(viewFractal2D.blueControl.value)
	var minusHalfPI = -0.5 * Math.PI
	var iterations = Math.round(Math.exp(viewFractal2D.iterationsControl.value))
	var redPhase = minusHalfPI - iterations * redFrequency
	var greenPhase = minusHalfPI - iterations * greenFrequency
	var bluePhase = minusHalfPI - iterations * blueFrequency
	var fractalWidth = 2.0 / viewer.zoom
	var screenMultiplier = fractalWidth / viewer.numberOfHorizontalPixels
	var lowerX = viewer.x - 0.5 * screenMultiplier * (viewer.numberOfHorizontalPixels - 1)
	var lowerY = viewer.y + 0.5 * screenMultiplier * (viewer.numberOfVerticalPixels - 1)
	var pixelSize = viewer.pixelSize
	var greenVector = polarCounterclockwise(gDoublePi / 3.0)
	var blueVector = polarCounterclockwise(-gDoublePi / 3.0)
	for (var verticalIndex = 0; verticalIndex < viewer.numberOfVerticalPixels; verticalIndex++) {
		for (var horizontalIndex = 0; horizontalIndex < viewer.numberOfHorizontalPixels; horizontalIndex++) {
			var point = [lowerX + screenMultiplier * horizontalIndex, lowerY - screenMultiplier * verticalIndex]
			var escape = getEscapeCount(viewer.escapeRadius, iterations, point)
			var red = escape * redFrequency + redPhase
			if (viewFractal2D.redColorControl.selectedState) {
				red += Math.acos(normalize2D(point)[0]) / Math.PI
			}
			red = Math.floor(127.999 * Math.sin(red) + 128.0)
			var green = escape * greenFrequency + greenPhase
			if (viewFractal2D.greenColorControl.selectedState) {
				green += Math.acos(dotProduct2D(greenVector, normalize2D(point))) / Math.PI
			}
			green = Math.floor(127.999 * Math.sin(green) + 128.0)
			var blue = escape * blueFrequency + bluePhase
			if (viewFractal2D.blueColorControl.selectedState) {
				blue += Math.acos(dotProduct2D(blueVector, normalize2D(point))) / Math.PI
			}
			blue = Math.floor(127.999 * Math.sin(blue) + 128.0)
			context.fillStyle = 'rgb(' + red + ', ' + green + ', ' + blue + ')'
			context.fillRect(horizontalIndex * pixelSize, verticalIndex * pixelSize, pixelSize, pixelSize)
		}
	}
	context.restore()
}

function drawFractal2DWithoutArguments() {
	drawFractal2D(viewBroker.viewFractal2D.fractalControl, viewBroker.view)
}

function drawNumberDisplay(control, viewer) {
	var context = viewBroker.context
	var boundingBox = control.boundingBox
	var x = getXClearBoxSetContext(boundingBox, context, control)
	var decimalPlaces = 0
	if (control.decimalPlaces != undefined) {
		decimalPlaces = control.decimalPlaces
	}
	drawNumericArray(context, control.numbers, viewBroker.textSpace, x, boundingBox[0][1] + viewBroker.textSpace, decimalPlaces)
}

function drawStringDisplay(control, viewer) {
	var context = viewBroker.context
	var boundingBox = control.boundingBox
	var x = getXClearBoxSetContext(boundingBox, context, control)
	drawArray(context, control.strings, viewBroker.textSpace, x, boundingBox[0][1] + viewBroker.textSpace)
}

function getEscapeCount(escapeRadius, iterations, point) {
	var radiusSquared = escapeRadius * escapeRadius
	var originalPoint = point.slice(0)
	var oldPoint = originalPoint
	var escapeCount = 0
	for (; escapeCount < iterations;) {
		escapeCount++
		add2D(rotate2DVector(point, point), originalPoint)
		var lengthSquared = lengthSquared2D(point)
		if (lengthSquared > radiusSquared) {
			var before = Math.log(Math.log2(Math.sqrt(lengthSquared)))
			var escapeExtra = 1.0 - before
			point[0] = escapeExtra * point[0] + before * oldPoint[0]
			point[1] = escapeExtra * point[1] + before * oldPoint[1]
			return escapeCount + escapeExtra
		}
		oldPoint = point.slice(0)
	}
	return escapeCount
}

function getXClearBoxSetContext(boundingBox, context, control) {
	clearBoundingBox(boundingBox, context)
	setTextContext(context)
	var x = boundingBox[0][0]
	if (control.textAlign == undefined) {
		context.textAlign = 'left'
		return x
	}
	context.textAlign = control.textAlign
	if (context.textAlign == 'center') {
		return 0.5 * (x + boundingBox[1][0])
	}
	else {
		if (context.textAlign == 'right') {
			x = boundingBox[1][0]
		}
	}
	return x
}

function mouseDownFractal(control, event, viewer) {
	moveXYManipulator.viewer = viewer
	moveXYManipulator.originalX = viewer.x
	moveXYManipulator.originalY = viewer.y
	viewBroker.mouseMoveManipulator = moveXYManipulator
}

var moveXYManipulator = {
	mouseMove: function(event) {
		if (viewBroker.mouseDown2D == null) {
			return
		}
		var mouseMovement = [event.offsetX - viewBroker.mouseDown2D[0], event.offsetY - viewBroker.mouseDown2D[1]]
		var movementLength = length2D(mouseMovement)
		if (movementLength == 0.0) {
			return
		}
		var viewFractal2D = viewBroker.viewFractal2D
		var multiplier = 2.0 / viewBroker.canvas.height / Math.exp(viewFractal2D.zoomControl.value)
		this.viewer.x = this.originalX - multiplier * mouseMovement[0]
		this.viewer.y = this.originalY + multiplier * mouseMovement[1]
		viewFractal2D.xyDisplay.numbers = [this.viewer.x, this.viewer.y]
		drawNumberDisplay(viewFractal2D.xyDisplay, this.viewer)
		drawFractal2DWithoutArguments()
	},
	mouseOut: function(event) {
		var viewFractal2D = viewBroker.viewFractal2D
		this.viewer.x = this.originalX
		this.viewer.y = this.originalY
		viewFractal2D.xyDisplay.numbers = [this.viewer.x, this.viewer.y]
		drawNumberDisplay(viewFractal2D.xyDisplay, this.viewer)
		viewBroker.mouseDown2D = null
		viewBroker.mouseMoveManipulator = null
		drawFractal2DWithoutArguments()
	},
	mouseUp: function(event) {
		viewBroker.mouseDown2D = null
		viewBroker.mouseMoveManipulator = null
		drawFractal2DWithoutArguments()
	}
}

function updateZoomDrawFractal2D(control, viewer) {
	var viewFractal2D = viewBroker.viewFractal2D
	viewer.zoom = Math.exp(control.value)
	viewFractal2D.zoomDisplay.numbers = [viewer.zoom]
	drawNumberDisplay(viewFractal2D.zoomDisplay, viewer)
	drawFractal2D(viewFractal2D.fractalControl, viewer)
}

function ViewFractal2D() {
	this.draw = function() {
		drawControls(viewBroker.viewFractal2D.controls, this)
	}
	this.mouseDown = function(event) {
		mouseDownControls(viewBroker.viewFractal2D.controls, event, this)
	}
	this.mouseMove = function(event) {
		if (viewBroker.mouseMoveManipulator != null) {
			var boundingBoxArea = this.controlBoundingBoxSize[0] * this.controlBoundingBoxSize[1]
			this.pixelSize = Math.round(Math.sqrt(boundingBoxArea / viewBroker.viewFractal2D.changePixelsControl.value))
			this.setPixelVariables()
			viewBroker.mouseMoveManipulator.mouseMove(event)
		}
	}
	this.mouseOut = function(event) {
		if (viewBroker.mouseMoveManipulator != null) {
			this.pixelSize = Math.round(viewBroker.viewFractal2D.pixelSizeControl.value)
			this.setPixelVariables()
			viewBroker.mouseMoveManipulator.mouseOut(event)
		}
	}
	this.mouseUp = function(event) {
		if (viewBroker.mouseMoveManipulator != null) {
			this.pixelSize = Math.round(viewBroker.viewFractal2D.pixelSizeControl.value)
			this.setPixelVariables()
			viewBroker.mouseMoveManipulator.mouseUp(event)
		}
	}
	this.setPixelVariables = function() {
		this.numberOfHorizontalPixels = Math.ceil(this.controlBoundingBoxSize[0] / this.pixelSize - gClose)
		this.numberOfVerticalPixels = Math.ceil(this.controlBoundingBoxSize[1] / this.pixelSize - gClose)
	}
	this.start = function() {
		var controls = []
		var height = viewBroker.canvas.height
		var viewFractal2D = {controls:controls}
		viewBroker.viewFractal2D = viewFractal2D

		var controlBoundingBox = [[0, 0], [viewBroker.heightMinus, height]]
		this.controlBoundingBoxSize = getSubtraction2D(controlBoundingBox[1], controlBoundingBox[0])
		viewFractal2D.fractalControl = {boundingBox:controlBoundingBox, draw:drawFractal2D, mouseDown:mouseDownFractal}
		controls.push(viewFractal2D.fractalControl)

		var zoomBoundingBox = [[viewBroker.heightMinus, 0], [height, height]]
		viewFractal2D.zoomControl = getVerticalSlider(zoomBoundingBox, Math.log(0.5), 'Z', Math.log(1000000))
		viewFractal2D.zoomControl.value = Math.log(this.zoom)
		viewFractal2D.zoomControl.controlChanged = updateZoomDrawFractal2D
		controls.push(viewFractal2D.zoomControl)
		this.setPixelVariables()

		var characterBegin = viewBroker.analysisCharacterBegin
		var sliderBegin = viewBroker.canvas.height
		var variableEndX = viewBroker.canvas.width
		var titleEndX = 0.45 * sliderBegin + 0.55 * variableEndX
		var xyTitleBox = [[characterBegin, 0], [titleEndX, 2 * viewBroker.textSpace]]
		controls.push({boundingBox:xyTitleBox, draw:drawStringDisplay, strings:['X', 'Y'], textAlign:'right'})

		var variableBeginX = titleEndX + viewBroker.titleVariableGap
		var xyVariableBox = [[variableBeginX, 0], [variableEndX, 2 * viewBroker.textSpace]]
		viewFractal2D.xyDisplay = {boundingBox:xyVariableBox, decimalPlaces:8, draw:drawNumberDisplay, numbers:[this.x, this.y]}
		controls.push(viewFractal2D.xyDisplay)

		var top = 2 * viewBroker.textSpace
		var zoomTitleBox = [[characterBegin, top], [titleEndX, top + viewBroker.textSpace]]
		controls.push({boundingBox:zoomTitleBox, draw:drawStringDisplay, strings:['Zoom'], textAlign:'right'})

		var zoomVariableBox = [[variableBeginX, top], [variableEndX, top + viewBroker.textSpace]]
		viewFractal2D.zoomDisplay = {boundingBox:zoomVariableBox, decimalPlaces:1, draw:drawNumberDisplay, numbers:[this.zoom]}
		controls.push(viewFractal2D.zoomDisplay)

		var intervals = intervalsFromToQuantity(sliderBegin, variableEndX, 2, false, false)
		viewFractal2D.redColorControl = getCheckbox([[sliderBegin, viewBroker.heightMinus], [intervals[0], height]], 'Red', false)
		viewFractal2D.redColorControl.controlChanged = drawFractal2DWithoutArguments
		controls.push(viewFractal2D.redColorControl)

		viewFractal2D.greenColorControl = getCheckbox([[intervals[0], viewBroker.heightMinus], [intervals[1], height]], 'Green', false)
		viewFractal2D.greenColorControl.controlChanged = drawFractal2DWithoutArguments
		controls.push(viewFractal2D.greenColorControl)

		viewFractal2D.blueColorControl = getCheckbox([[intervals[1], viewBroker.heightMinus], [variableEndX, height]], 'Blue', false)
		viewFractal2D.blueColorControl.controlChanged = drawFractal2DWithoutArguments
		controls.push(viewFractal2D.blueColorControl)

		top = viewBroker.heightMinus - 1.5 * viewBroker.textSpace
		var multiplyDotProductBox = [[characterBegin, top], [titleEndX, top + viewBroker.textSpace]]
		controls.push({boundingBox:multiplyDotProductBox, draw:drawStringDisplay, strings:['Color Direction'], textAlign:'left'})

		top = viewBroker.heightMinus - viewBroker.controlWidth - viewBroker.wideHeight
		var changePixelsBoundingBox = [[sliderBegin, top], [variableEndX, top + viewBroker.wideHeight]]
		viewFractal2D.changePixelsControl = getHorizontalSliderWide(changePixelsBoundingBox, 1000, 'Change Pixels', 100000)
		viewFractal2D.changePixelsControl.controlChanged = drawFractal2DWithoutArguments
		viewFractal2D.changePixelsControl.titleEndX = titleEndX
		viewFractal2D.changePixelsControl.variableBeginX = variableBeginX
		viewFractal2D.changePixelsControl.value = this.changePixels
		controls.push(viewFractal2D.changePixelsControl)

		top -= viewBroker.wideHeight
		var pixelSizeBoundingBox = [[sliderBegin, top], [variableEndX, top + viewBroker.wideHeight]]
		viewFractal2D.pixelSizeControl = getHorizontalSliderWide(pixelSizeBoundingBox, 1, 'Pixel Size', 5)
		viewFractal2D.pixelSizeControl.controlChanged = drawFractal2DWithoutArguments
		viewFractal2D.pixelSizeControl.titleEndX = titleEndX
		viewFractal2D.pixelSizeControl.variableBeginX = variableBeginX
		viewFractal2D.pixelSizeControl.value = this.pixelSize
		controls.push(viewFractal2D.pixelSizeControl)

		top -= viewBroker.wideHeight
		var iterationsBoundingBox = [[sliderBegin, top], [variableEndX, top + viewBroker.wideHeight]]
		viewFractal2D.iterationsControl = getHorizontalSliderWide(iterationsBoundingBox, Math.log(1), 'Iterations', Math.log(500))
		viewFractal2D.iterationsControl.controlChanged = drawFractal2DWithoutArguments
		viewFractal2D.iterationsControl.titleEndX = titleEndX
		viewFractal2D.iterationsControl.variableBeginX = variableBeginX
		viewFractal2D.iterationsControl.value = Math.log(this.iterations)
		viewFractal2D.iterationsControl.valueFunction = Math.exp
		controls.push(viewFractal2D.iterationsControl)

		top -= viewBroker.wideHeight
		var blueBoundingBox = [[sliderBegin, top], [variableEndX, top + viewBroker.wideHeight]]
		viewFractal2D.blueControl = getHorizontalSliderWide(blueBoundingBox, Math.log(0.005), 'Blue Frequency', Math.log(2.0))
		viewFractal2D.blueControl.controlChanged = drawFractal2DWithoutArguments
		viewFractal2D.blueControl.decimalPlaces = 3
		viewFractal2D.blueControl.titleEndX = titleEndX
		viewFractal2D.blueControl.variableBeginX = variableBeginX
		viewFractal2D.blueControl.value = Math.log(this.blueFrequency)
		viewFractal2D.blueControl.valueFunction = Math.exp
		controls.push(viewFractal2D.blueControl)

		top -= viewBroker.wideHeight
		var greenBoundingBox = [[sliderBegin, top], [variableEndX, top + viewBroker.wideHeight]]
		viewFractal2D.greenControl = getHorizontalSliderWide(greenBoundingBox, Math.log(0.005), 'Green Frequency', Math.log(2.0))
		viewFractal2D.greenControl.controlChanged = drawFractal2DWithoutArguments
		viewFractal2D.greenControl.decimalPlaces = 3
		viewFractal2D.greenControl.titleEndX = titleEndX
		viewFractal2D.greenControl.variableBeginX = variableBeginX
		viewFractal2D.greenControl.value = Math.log(this.greenFrequency)
		viewFractal2D.greenControl.valueFunction = Math.exp
		controls.push(viewFractal2D.greenControl)

		top -= viewBroker.wideHeight
		var redBoundingBox = [[sliderBegin, top], [variableEndX, top + viewBroker.wideHeight]]
		viewFractal2D.redControl = getHorizontalSliderWide(redBoundingBox, Math.log(0.005), 'Red Frequency', Math.log(2.0))
		viewFractal2D.redControl.controlChanged = drawFractal2DWithoutArguments
		viewFractal2D.redControl.decimalPlaces = 3
		viewFractal2D.redControl.titleEndX = titleEndX
		viewFractal2D.redControl.variableBeginX = variableBeginX
		viewFractal2D.redControl.value = Math.log(this.redFrequency)
		viewFractal2D.redControl.valueFunction = Math.exp
		controls.push(viewFractal2D.redControl)
	}
}
