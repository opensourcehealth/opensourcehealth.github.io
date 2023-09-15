//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function drawFractal2DWithoutArguments() {
	viewBroker.view.viewControl.draw(viewBroker.view)
}

class Fractal2DControl extends CanvasControl {
	constructor(boundingBox) {
		super()
		this.boundingBox = boundingBox
		this.clipBox = boundingBox
	}
	drawPrivate(view) {
		var context = viewBroker.context
		var boundingBox = this.boundingBox
		clearBoundingBox(boundingBox, context)
		var redFrequency = Math.exp(view.redControl.value)
		var greenFrequency = Math.exp(view.greenControl.value)
		var blueFrequency = Math.exp(view.blueControl.value)
		var minusHalfPI = -0.5 * Math.PI
		var iterations = Math.round(Math.exp(view.iterationsControl.value))
		var redPhase = minusHalfPI - iterations * redFrequency
		var greenPhase = minusHalfPI - iterations * greenFrequency
		var bluePhase = minusHalfPI - iterations * blueFrequency
		var fractalWidth = 2.0 / view.zoom
		var screenMultiplier = fractalWidth / view.numberOfHorizontalPixels
		var lowerX = view.x - 0.5 * screenMultiplier * (view.numberOfHorizontalPixels - 1)
		var lowerY = view.y + 0.5 * screenMultiplier * (view.numberOfVerticalPixels - 1)
		var pixelSize = view.pixelSize
		var greenVector = polarCounterclockwise(gDoublePi / 3.0)
		var blueVector = polarCounterclockwise(-gDoublePi / 3.0)
		for (var verticalIndex = 0; verticalIndex < view.numberOfVerticalPixels; verticalIndex++) {
			for (var horizontalIndex = 0; horizontalIndex < view.numberOfHorizontalPixels; horizontalIndex++) {
				var point = [lowerX + screenMultiplier * horizontalIndex, lowerY - screenMultiplier * verticalIndex]
				var escape = getEscapeCount(view.escapeRadius, iterations, point)
				var red = escape * redFrequency + redPhase
				if (view.redColorControl.selectedState) {
					red += Math.acos(normalize2D(point)[0]) / Math.PI
				}
				red = Math.floor(127.999 * Math.sin(red) + 128.0)
				var green = escape * greenFrequency + greenPhase
				if (view.greenColorControl.selectedState) {
					green += Math.acos(dotProduct2D(greenVector, normalize2D(point))) / Math.PI
				}
				green = Math.floor(127.999 * Math.sin(green) + 128.0)
				var blue = escape * blueFrequency + bluePhase
				if (view.blueColorControl.selectedState) {
					blue += Math.acos(dotProduct2D(blueVector, normalize2D(point))) / Math.PI
				}
				blue = Math.floor(127.999 * Math.sin(blue) + 128.0)
				context.fillStyle = 'rgb(' + red + ', ' + green + ', ' + blue + ')'
				context.fillRect(horizontalIndex * pixelSize, verticalIndex * pixelSize, pixelSize, pixelSize)
			}
		}
	}
	mouseDownPrivate(event, view) {
		moveXYManipulator.originalX = view.x
		moveXYManipulator.originalY = view.y
		viewBroker.mouseMoveManipulator = moveXYManipulator
	}
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

var moveXYManipulator = {
	mouseMove: function(event) {
		if (viewBroker.mouseDown2D == undefined) {
			return
		}
		var mouseMovement = [event.offsetX - viewBroker.mouseDown2D[0], event.offsetY - viewBroker.mouseDown2D[1]]
		var movementLength = length2D(mouseMovement)
		if (movementLength == 0.0) {
			return
		}
		var view = viewBroker.view
		var multiplier = 2.0 / viewBroker.canvas.height / Math.exp(view.zoomControl.value)
		view.x = this.originalX - multiplier * mouseMovement[0]
		view.y = this.originalY + multiplier * mouseMovement[1]
		view.xyDisplay.numbers = [view.x, view.y]
		view.xyDisplay.draw(view)
		drawFractal2DWithoutArguments()
	},
	mouseOut: function(event) {
		var view = viewBroker.view
		view.x = this.originalX
		view.y = this.originalY
		view.xyDisplay.numbers = [view.x, view.y]
		view.xyDisplay.draw(view)
		viewBroker.mouseDown2D = undefined
		viewBroker.mouseMoveManipulator = null
		drawFractal2DWithoutArguments()
	},
	mouseUp: function(event) {
		viewBroker.mouseDown2D = undefined
		viewBroker.mouseMoveManipulator = null
		drawFractal2DWithoutArguments()
	}
}

class NumberDisplay extends CanvasControl {
	constructor(boundingBox, numbers, decimalPlaces) {
		super()
		this.boundingBox = boundingBox
		this.decimalPlaces = getValueDefault(decimalPlaces, 0)
		this.numbers = numbers
	}
	drawPrivate(view) {
		var context = viewBroker.context
		var boundingBox = this.boundingBox
		var x = getXClearBoxSetContext(boundingBox, context, this)
		drawNumericArrays(context, this.numbers, viewBroker.textSpace, x, boundingBox[0][1] + viewBroker.textSpace, this.decimalPlaces)
	}
}

class StringDisplay extends CanvasControl {
	constructor(boundingBox, strings, textAlign) {
		super()
		this.boundingBox = boundingBox
		this.strings = strings
		this.textAlign = getValueDefault(textAlign, 'left')
	}
	drawPrivate(view) {
		var context = viewBroker.context
		var boundingBox = this.boundingBox
		var x = getXClearBoxSetContext(boundingBox, context, this)
		drawArrays(context, this.strings, viewBroker.textSpace, x, boundingBox[0][1] + viewBroker.textSpace)
	}
}

function updateZoomDrawFractal2D(control, view) {
	view.zoom = Math.exp(control.value)
	view.zoomDisplay.numbers = [view.zoom]
	view.zoomDisplay.draw(view)
	view.viewControl.draw(view)
}

function ViewFractal2D() {
	this.draw = function() {
		drawControls(this.controls, this)
	}
	this.mouseDown = function(event) {
		mouseDownControls(this.controls, event, this)
	}
	this.mouseMove = function(event) {
		if (viewBroker.mouseMoveManipulator != null) {
			var boundingBoxArea = this.viewBoundingBoxSize[0] * this.viewBoundingBoxSize[1]
			this.pixelSize = Math.round(Math.sqrt(boundingBoxArea / this.changePixelsControl.value))
			this.setPixelVariables()
			viewBroker.mouseMoveManipulator.mouseMove(event)
		}
	}
	this.mouseOut = function(event) {
		if (viewBroker.mouseMoveManipulator != null) {
			this.pixelSize = Math.round(this.pixelSizeControl.value)
			this.setPixelVariables()
			viewBroker.mouseMoveManipulator.mouseOut(event)
		}
	}
	this.mouseUp = function(event) {
		if (viewBroker.mouseMoveManipulator != null) {
			this.pixelSize = Math.round(this.pixelSizeControl.value)
			this.setPixelVariables()
			viewBroker.mouseMoveManipulator.mouseUp(event)
		}
	}
	this.setPixelVariables = function() {
		this.numberOfHorizontalPixels = Math.ceil(this.viewBoundingBoxSize[0] / this.pixelSize - gClose)
		this.numberOfVerticalPixels = Math.ceil(this.viewBoundingBoxSize[1] / this.pixelSize - gClose)
	}
	this.start = function() {
		var controls = []
		var height = viewBroker.canvas.height
		this.controls = controls
		this.viewBoundingBox = [[0, 0], [viewBroker.heightMinus, height]]
		this.viewBoundingBoxSize = getSubtraction2D(this.viewBoundingBox[1], this.viewBoundingBox[0])
		this.viewControl = new Fractal2DControl(this.viewBoundingBox)
		controls.push(this.viewControl)

		var zoomBoundingBox = [[viewBroker.heightMinus, 0], [height, height]]
		this.zoomControl = new VerticalSlider(zoomBoundingBox, Math.log(0.5), 'Z', Math.log(1000000))
		this.zoomControl.value = Math.log(this.zoom)
		this.zoomControl.controlChanged = updateZoomDrawFractal2D
		controls.push(this.zoomControl)
		this.setPixelVariables()

		var characterBegin = viewBroker.analysisCharacterBegin
		var sliderBegin = viewBroker.canvas.height
		var variableEndX = viewBroker.canvas.width

		var intervals = intervalsFromToQuantity(sliderBegin, variableEndX, 2, false, false)
		this.redColorControl = new Checkbox([[sliderBegin, viewBroker.heightMinus], [intervals[0], height]], 'Red', false)
		this.redColorControl.controlChanged = drawFractal2DWithoutArguments
		controls.push(this.redColorControl)

		this.greenColorControl = new Checkbox([[intervals[0], viewBroker.heightMinus], [intervals[1], height]], 'Green', false)
		this.greenColorControl.controlChanged = drawFractal2DWithoutArguments
		controls.push(this.greenColorControl)

		this.blueColorControl = new Checkbox([[intervals[1], viewBroker.heightMinus], [variableEndX, height]], 'Blue', false)
		this.blueColorControl.controlChanged = drawFractal2DWithoutArguments
		controls.push(this.blueColorControl)

		top = viewBroker.heightMinus - 1.5 * viewBroker.textSpace
		var multiplyDotProductBox = [[characterBegin, top], [titleEndX, top + viewBroker.textSpace]]
		controls.push(new StringDisplay(multiplyDotProductBox, ['Color Direction']))

		top = viewBroker.heightMinus - viewBroker.controlWidth - viewBroker.wideHeight
		var changeBoundingBox = [[sliderBegin, top], [variableEndX, top + viewBroker.wideHeight]]
		this.changePixelsControl = new HorizontalSliderWide(changeBoundingBox, 1000, 'Change Pixels', 100000, this.changePixels)
		this.changePixelsControl.controlChanged = drawFractal2DWithoutArguments
		controls.push(this.changePixelsControl)

		top -= viewBroker.wideHeight
		var pixelSizeBoundingBox = [[sliderBegin, top], [variableEndX, top + viewBroker.wideHeight]]
		this.pixelSizeControl = new HorizontalSliderWide(pixelSizeBoundingBox, 1, 'Pixel Size', 5, this.pixelSize)
		this.pixelSizeControl.controlChanged = drawFractal2DWithoutArguments
		controls.push(this.pixelSizeControl)

		top -= viewBroker.wideHeight
		var iterationsBox = [[sliderBegin, top], [variableEndX, top + viewBroker.wideHeight]]
		this.iterationsControl = new HorizontalSliderWide(iterationsBox, Math.log(1), 'Iterations', Math.log(500))
		this.iterationsControl.controlChanged = drawFractal2DWithoutArguments
		this.iterationsControl.value = Math.log(this.iterations)
		this.iterationsControl.valueFunction = Math.exp
		controls.push(this.iterationsControl)

		top -= viewBroker.wideHeight
		var blueBoundingBox = [[sliderBegin, top], [variableEndX, top + viewBroker.wideHeight]]
		this.blueControl = new HorizontalSliderWide(blueBoundingBox, Math.log(0.005), 'Blue Frequency', Math.log(2.0))
		this.blueControl.controlChanged = drawFractal2DWithoutArguments
		this.blueControl.decimalPlaces = 3
		this.blueControl.value = Math.log(this.blueFrequency)
		this.blueControl.valueFunction = Math.exp
		controls.push(this.blueControl)

		top -= viewBroker.wideHeight
		var greenBoundingBox = [[sliderBegin, top], [variableEndX, top + viewBroker.wideHeight]]
		this.greenControl = new HorizontalSliderWide(greenBoundingBox, Math.log(0.005), 'Green Frequency', Math.log(2.0))
		this.greenControl.controlChanged = drawFractal2DWithoutArguments
		this.greenControl.decimalPlaces = 3
		this.greenControl.value = Math.log(this.greenFrequency)
		this.greenControl.valueFunction = Math.exp
		controls.push(this.greenControl)

		top -= viewBroker.wideHeight
		var redBoundingBox = [[sliderBegin, top], [variableEndX, top + viewBroker.wideHeight]]
		this.redControl = new HorizontalSliderWide(redBoundingBox, Math.log(0.005), 'Red Frequency', Math.log(2.0))
		this.redControl.controlChanged = drawFractal2DWithoutArguments
		this.redControl.decimalPlaces = 3
		this.redControl.value = Math.log(this.redFrequency)
		this.redControl.valueFunction = Math.exp
		controls.push(this.redControl)

		var titleEndX = this.redControl.titleEndX
		var xyTitleBox = [[characterBegin, 0], [titleEndX, 2 * viewBroker.textSpace]]
		controls.push(new StringDisplay(xyTitleBox, ['X', 'Y'], 'right'))

		var variableBeginX = titleEndX + viewBroker.halfTextSpace
		var xyVariableBox = [[variableBeginX, 0], [variableEndX, 2 * viewBroker.textSpace]]
		this.xyDisplay = new NumberDisplay(xyVariableBox, [this.x, this.y], 8)
		controls.push(this.xyDisplay)

		var top = 2 * viewBroker.textSpace
		var zoomTitleBox = [[characterBegin, top], [titleEndX, top + viewBroker.textSpace]]
		controls.push(new StringDisplay(zoomTitleBox, ['Zoom'], 'right'))

		var zoomVariableBox = [[variableBeginX, top], [variableEndX, top + viewBroker.textSpace]]
		this.zoomDisplay = new NumberDisplay(zoomVariableBox, [this.zoom], 1)
		controls.push(this.zoomDisplay)
	}
}
