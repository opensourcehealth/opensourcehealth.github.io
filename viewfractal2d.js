//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function drawFractal2DWithoutArguments() {
	viewBroker.view.viewControl.draw(viewBroker.context)
}

class Fractal2DControl extends CanvasControl {
	constructor(boundingBox) {
		super()
		this.boundingBox = boundingBox
		this.clipBox = boundingBox
	}
	drawPrivate(context) {
		var boundingBox = this.boundingBox
		clearBoundingBox(boundingBox, context)
		var redFrequency = Math.exp(this.view.redControl.value)
		var greenFrequency = Math.exp(this.view.greenControl.value)
		var blueFrequency = Math.exp(this.view.blueControl.value)
		var minusHalfPI = -0.5 * Math.PI
		var iterations = Math.round(Math.exp(this.view.iterationsControl.value))
		var redPhase = minusHalfPI - iterations * redFrequency
		var greenPhase = minusHalfPI - iterations * greenFrequency
		var bluePhase = minusHalfPI - iterations * blueFrequency
		var fractalWidth = 2.0 / this.view.zoom
		var screenMultiplier = fractalWidth / this.view.numberOfHorizontalPixels
		var lowerX = this.view.x - 0.5 * screenMultiplier * (this.view.numberOfHorizontalPixels - 1)
		var lowerY = this.view.y + 0.5 * screenMultiplier * (this.view.numberOfVerticalPixels - 1)
		var pixelSize = this.view.pixelSize
		var greenVector = Vector.polarCounterclockwise(gPI2 / 3.0)
		var blueVector = Vector.polarCounterclockwise(-gPI2 / 3.0)
		for (var verticalIndex = 0; verticalIndex < this.view.numberOfVerticalPixels; verticalIndex++) {
			for (var horizontalIndex = 0; horizontalIndex < this.view.numberOfHorizontalPixels; horizontalIndex++) {
				var point = [lowerX + screenMultiplier * horizontalIndex, lowerY - screenMultiplier * verticalIndex]
				var escape = getEscapeCount(this.view.escapeRadius, iterations, point)
				var red = escape * redFrequency + redPhase
				if (this.view.redColorControl.getValue()) {
					red += Math.acos(normalize2D(point)[0]) / Math.PI
				}
				red = Math.floor(127.999 * Math.sin(red) + 128.0)
				var green = escape * greenFrequency + greenPhase
				if (this.view.greenColorControl.getValue()) {
					green += Math.acos(Vector.dotProduct2D(greenVector, normalize2D(point))) / Math.PI
				}
				green = Math.floor(127.999 * Math.sin(green) + 128.0)
				var blue = escape * blueFrequency + bluePhase
				if (this.view.blueColorControl.getValue()) {
					blue += Math.acos(Vector.dotProduct2D(blueVector, normalize2D(point))) / Math.PI
				}
				blue = Math.floor(127.999 * Math.sin(blue) + 128.0)
				context.fillStyle = 'rgb(' + red + ', ' + green + ', ' + blue + ')'
				context.fillRect(horizontalIndex * pixelSize, verticalIndex * pixelSize, pixelSize, pixelSize)
			}
		}
	}
	mouseDownPrivate(context, event) {
		moveXYManipulator.originalX = this.view.x
		moveXYManipulator.originalY = this.view.y
		viewCanvas.mouseMoveManipulator = moveXYManipulator
	}
}

function getEscapeCount(escapeRadius, iterations, point) {
	var radiusSquared = escapeRadius * escapeRadius
	var originalPoint = point.slice(0)
	var oldPoint = originalPoint
	var escapeCount = 0
	for (; escapeCount < iterations;) {
		escapeCount++
		Vector.add2D(Vector.rotate2DVector(point, point), originalPoint)
		var lengthSquared = Vector.lengthSquared2D(point)
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

var moveXYManipulator = {
	mouseMove: function(context, event) {
		if (viewCanvas.mouseDown2D == undefined) {
			return
		}
		var mouseMovement = [event.offsetX - viewCanvas.mouseDown2D[0], event.offsetY - viewCanvas.mouseDown2D[1]]
		var movementLength = Vector.length2D(mouseMovement)
		if (movementLength == 0.0) {
			return
		}
		var view = viewBroker.view
		var multiplier = 2.0 / viewBroker.canvas.height / Math.exp(view.zoomControl.value)
		view.x = this.originalX - multiplier * mouseMovement[0]
		view.y = this.originalY + multiplier * mouseMovement[1]
		view.xyDisplay.numbers = [view.x, view.y]
		view.xyDisplay.draw(viewBroker.context)
		drawFractal2DWithoutArguments()
	},
	mouseOut: function(context, event) {
		var view = viewBroker.view
		view.x = this.originalX
		view.y = this.originalY
		view.xyDisplay.numbers = [view.x, view.y]
		view.xyDisplay.draw(viewBroker.context)
		viewCanvas.mouseDown2D = undefined
		viewCanvas.mouseMoveManipulator = undefined
		drawFractal2DWithoutArguments()
	},
	mouseUp: function(context, event) {
		viewCanvas.mouseDown2D = undefined
		viewCanvas.mouseMoveManipulator = undefined
		drawFractal2DWithoutArguments()
	}
}

class NumberDisplay extends CanvasControl {
	constructor(boundingBox, numbers, decimalPlaces) {
		super()
		this.boundingBox = boundingBox
		this.decimalPlaces = Value.getValueDefault(decimalPlaces, 0)
		this.numbers = numbers
	}
	drawPrivate(context) {
		var boundingBox = this.boundingBox
		var x = getXClearBoxSetContext(boundingBox, context, this)
		drawNumericArrays(context, this.numbers, viewCanvas.textSpace, x, boundingBox[0][1] + viewCanvas.textDown, this.decimalPlaces)
	}
}

class StringDisplay extends CanvasControl {
	constructor(boundingBox, strings, textAlign) {
		super()
		this.boundingBox = boundingBox
		this.strings = strings
		this.textAlign = Value.getValueDefault(textAlign, 'left')
	}
	drawPrivate(context) {
		var boundingBox = this.boundingBox
		var x = getXClearBoxSetContext(boundingBox, context, this)
		drawArrays(context, this.strings, viewCanvas.textSpace, x, boundingBox[0][1] + viewCanvas.textDown)
	}
}

function updateZoomDrawFractal2D(context, control) {
	var view = control.view
	view.zoom = Math.exp(control.value)
	view.zoomDisplay.numbers = [view.zoom]
	view.zoomDisplay.draw(context)
	view.viewControl.draw(context)
}

function ViewFractal2D() {
	this.draw = function(context) {
		drawControls(context, this.controls, this)
	}
	this.mouseDown = function(context, event) {
		mouseDownControls(context, this.controls, event)
	}
	this.mouseMove = function(context, event) {
		if (viewCanvas.mouseMoveManipulator != undefined) {
			var boundingBoxArea = this.viewBoundingBoxSize[0] * this.viewBoundingBoxSize[1]
			this.pixelSize = Math.round(Math.max(this.pixelSizeControl.value, Math.sqrt(boundingBoxArea / this.changePixelsControl.value)))
			this.setPixelVariables()
			viewCanvas.mouseMoveManipulator.mouseMove(context, event)
		}
	}
	this.mouseOut = function(context, event) {
		if (viewCanvas.mouseMoveManipulator != undefined) {
			this.pixelSize = Math.round(this.pixelSizeControl.value)
			this.setPixelVariables()
			viewCanvas.mouseMoveManipulator.mouseOut(context, event)
		}
	}
	this.mouseUp = function(context, event) {
		if (viewCanvas.mouseMoveManipulator != undefined) {
			this.pixelSize = Math.round(this.pixelSizeControl.value)
			this.setPixelVariables()
			viewCanvas.mouseMoveManipulator.mouseUp(context, event)
		}
	}
	this.setPixelVariables = function() {
		this.numberOfHorizontalPixels = Math.ceil(this.viewBoundingBoxSize[0] / this.pixelSize - gClose)
		this.numberOfVerticalPixels = Math.ceil(this.viewBoundingBoxSize[1] / this.pixelSize - gClose)
	}
	this.start = function() {
		var controls = []
		var height = viewBroker.canvas.height
		var width = viewBroker.canvas.width
		var bottom = height
		var nextBottom = bottom - Checkbox.defaultHeightNew()
		this.controls = controls
		this.viewBoundingBox = [[0, 0], [viewBroker.heightMinus, height]]
		this.viewBoundingBoxSize = Vector.getSubtraction2D(this.viewBoundingBox[1], this.viewBoundingBox[0])
		this.viewControl = new Fractal2DControl(this.viewBoundingBox)
		controls.push(this.viewControl)

		var zoomBoundingBox = [[viewBroker.heightMinus, 0], [height, height]]
		this.zoomControl = new VerticalSlider(zoomBoundingBox, Math.log(0.5), 'Z', Math.log(5000000000))
		this.zoomControl.value = Math.log(this.zoom)
		this.zoomControl.controlChanged = updateZoomDrawFractal2D
		controls.push(this.zoomControl)
		this.setPixelVariables()

		var characterBegin = viewBroker.analysisCharacterBegin
		var variableEndX = viewBroker.canvas.width

		var intervals = Vector.intervalsFromToQuantity(height, variableEndX, 4, false, false)
		this.redColorControl = new Checkbox([[height, nextBottom], [intervals[0], bottom]], 'Red', false)
		this.redColorControl.controlChanged = drawFractal2DWithoutArguments
		controls.push(this.redColorControl)

		this.greenColorControl = new Checkbox([[intervals[0], nextBottom], [intervals[1], bottom]], 'Green', false)
		this.greenColorControl.controlChanged = drawFractal2DWithoutArguments
		controls.push(this.greenColorControl)

		this.blueColorControl = new Checkbox([[intervals[1], nextBottom], [variableEndX, bottom]], 'Blue', false)
		this.blueColorControl.controlChanged = drawFractal2DWithoutArguments
		controls.push(this.blueColorControl)

		bottom = nextBottom
		nextBottom -= viewCanvas.controlWidth
		var multiplyDotProductBox = [[characterBegin, nextBottom], [width, bottom]]
		controls.push(new StringDisplay(multiplyDotProductBox, ['Color Direction']))

		bottom = nextBottom
		nextBottom -= viewCanvas.wideHeight
		var changeBoundingBox = [[height, nextBottom], [variableEndX, bottom]]
		this.changePixelsControl = new HorizontalSliderWide(changeBoundingBox, 1000, 'Change Pixels', 30000, this.changePixels)
		this.changePixelsControl.controlChanged = drawFractal2DWithoutArguments
		controls.push(this.changePixelsControl)

		bottom = nextBottom
		nextBottom -= viewCanvas.wideHeight
		var pixelSizeBoundingBox = [[height, nextBottom], [variableEndX, bottom]]
		this.pixelSizeControl = new HorizontalSliderWide(pixelSizeBoundingBox, 1, 'Pixel Size', 5, this.pixelSize)
		this.pixelSizeControl.controlChanged = drawFractal2DWithoutArguments
		controls.push(this.pixelSizeControl)

		bottom = nextBottom
		nextBottom -= viewCanvas.wideHeight
		var iterationsBox = [[height, nextBottom], [variableEndX, bottom]]
		this.iterationsControl = new HorizontalSliderWide(iterationsBox, Math.log(1), 'Iterations', Math.log(500))
		this.iterationsControl.controlChanged = drawFractal2DWithoutArguments
		this.iterationsControl.value = Math.log(this.iterations)
		this.iterationsControl.valueFunction = Math.exp
		controls.push(this.iterationsControl)

		bottom = nextBottom
		nextBottom -= viewCanvas.wideHeight
		var blueBoundingBox = [[height, nextBottom], [variableEndX, bottom]]
		this.blueControl = new HorizontalSliderWide(blueBoundingBox, Math.log(0.005), 'Blue Frequency', Math.log(2.0))
		this.blueControl.controlChanged = drawFractal2DWithoutArguments
		this.blueControl.decimalPlaces = 3
		this.blueControl.value = Math.log(this.blueFrequency)
		this.blueControl.valueFunction = Math.exp
		controls.push(this.blueControl)

		bottom = nextBottom
		nextBottom -= viewCanvas.wideHeight
		var greenBoundingBox = [[height, nextBottom], [variableEndX, bottom]]
		this.greenControl = new HorizontalSliderWide(greenBoundingBox, Math.log(0.005), 'Green Frequency', Math.log(2.0))
		this.greenControl.controlChanged = drawFractal2DWithoutArguments
		this.greenControl.decimalPlaces = 3
		this.greenControl.value = Math.log(this.greenFrequency)
		this.greenControl.valueFunction = Math.exp
		controls.push(this.greenControl)

		bottom = nextBottom
		nextBottom -= viewCanvas.wideHeight
		var redBoundingBox = [[height, nextBottom], [variableEndX, bottom]]
		this.redControl = new HorizontalSliderWide(redBoundingBox, Math.log(0.005), 'Red Frequency', Math.log(2.0))
		this.redControl.controlChanged = drawFractal2DWithoutArguments
		this.redControl.decimalPlaces = 3
		this.redControl.value = Math.log(this.redFrequency)
		this.redControl.valueFunction = Math.exp
		controls.push(this.redControl)

		var nextTop = viewCanvas.textSpace * 2.0
		var titleEndX = this.redControl.titleEndX
		var xyTitleBox = [[characterBegin, 0], [titleEndX, nextTop]]
		controls.push(new StringDisplay(xyTitleBox, ['X', 'Y'], 'right'))

		var variableBeginX = titleEndX + viewCanvas.halfTextSpace
		var xyVariableBox = [[variableBeginX, 0], [variableEndX, nextTop]]
		this.xyDisplay = new NumberDisplay(xyVariableBox, [this.x, this.y], 11)
		controls.push(this.xyDisplay)

		var top = nextTop
		nextTop += viewCanvas.textSpace+1
		var zoomTitleBox = [[characterBegin, top], [titleEndX, nextTop]]
		controls.push(new StringDisplay(zoomTitleBox, ['Zoom'], 'right'))

		var zoomVariableBox = [[variableBeginX, top], [width, nextTop]]
		this.zoomDisplay = new NumberDisplay(zoomVariableBox, [this.zoom], 1)
		controls.push(this.zoomDisplay)
		setViewControls(controls, this)
	}
}
