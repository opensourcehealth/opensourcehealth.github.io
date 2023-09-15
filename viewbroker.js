//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gGridSpacingMultiplier = 0.2

class CanvasControl {
	static defaultHeightNew() {
		return viewBroker.controlWidth
	}
	draw(view) {
		if (this.getDisplay(view) != false) {
			var context = viewBroker.context
			if (this.clipBox != undefined) {
				var clipBox = this.clipBox
				context.save()
				var region = new Path2D()
				var size = getSubtraction2D(clipBox[1], clipBox[0])
				region.rect(clipBox[0][0], clipBox[0][1], size[0], size[1])
				context.clip(region)
			}
			this.drawPrivate(view)
			if (this.clipBox != undefined) {
				context.restore()
			}
		}
	}
	getDisplay(view) {
		if (this.displayFunction == undefined) {
			return this.display
		}

		return this.displayFunction(this, view)
	}
	mouseDown(event, view) {
		if (this.mouseDownPrivate == undefined) {
			return
		}

		if (!isPointInsideBoundingBox(this.boundingBox, viewBroker.mouseDown2D) || this.getDisplay(view) == false) {
			return
		}

		if (this.clipBox == undefined) {
			this.mouseDownPrivate(event, view)
			return
		}

		if (isPointInsideBoundingBox(this.clipBox, viewBroker.mouseDown2D)) {
			this.mouseDownPrivate(event, view)
		}
	}
	resize(boundingBox) {
		this.boundingBox = boundingBox
	}
}

function boundDrawControlSlider(control, view) {
	control.value = Math.max(control.value, control.lower)
	control.value = Math.min(control.value, control.upper)
	drawControlSlider(control, view)
}

class Button extends CanvasControl {
	constructor(boundingBox, text) {
		super()
		this.boundingBox = boundingBox
		this.text = text
	}
	drawPrivate(view) {
		drawControlText(this.boundingBox, this.text)
	}
	mouseDownPrivate(event, view) {
		if (this.onClick != undefined) {
			this.onClick(this, event, view)
		}
	}
}

class Checkbox extends CanvasControl {
	constructor(boundingBox, text, selectedState) {
		super()
		this.boundingBox = boundingBox
		if (Array.isArray(selectedState)) {
			this.key = selectedState[0]
			this.valueMap = selectedState[1]
		}
		else {
			this.selectedState = getValueTrue(selectedState)
		}

		this.text = text
	}
	drawPrivate(view) {
		var boundingBox = this.boundingBox
		drawControlText(boundingBox, this.text)
		var context = viewBroker.context
		clearFillBoundingBox(boundingBox, context)
		var outset = 10
		var left = boundingBox[0][0] + 0.6 * outset
		var width = boundingBox[1][1] - boundingBox[0][1] - 2 * outset
		var checkboxTop = boundingBox[0][1] + outset
		setTextContext(context, 'center')
		context.fillText(this.text, 0.5 * (left + width + boundingBox[1][0]), boundingBox[1][1] - viewBroker.textControlLift)
		context.lineWidth = 1.0
		if (this.getState()) {
			context.beginPath()
			moveToPoint(context, [left, checkboxTop + 0.7 * width])
			lineToPoint(context, [left + 0.05 * width, checkboxTop + 0.65 * width])
			lineToPoint(context, [left + 0.45 * width, checkboxTop + 0.85 * width])
			lineToPoint(context, [left + 0.95 * width, checkboxTop - 0.2 * width])
			lineToPoint(context, [left + width, checkboxTop - 0.15 * width])
			lineToPoint(context, [left + 0.5 * width, checkboxTop + 1.2 * width])
			context.closePath()
			context.fillStyle = 'green'
			context.strokeStyle = 'green'
			context.stroke()
			context.fill()
		}
		else {
			strokeRoundRect(left, checkboxTop, context, left + width, checkboxTop + width, 1)
		}
	}
	getState(event, view) {
		if (this.selectedState == undefined) {
			return this.valueMap.get(this.key)
		}

		return this.selectedState
	}
	mouseDownPrivate(event, view) {
		this.toggleState()
		this.drawPrivate(view)
		waitCallControlChanged(this, view)
	}
	toggleState() {
		if (this.selectedState == undefined) {
			this.valueMap.set(this.key, !this.valueMap.get(this.key))
			return
		}

		this.selectedState = !this.selectedState
	}
}

class Choice extends CanvasControl {
	constructor(boundingBox, texts, selectedIndex) {
		super()
		this.boundingBox = boundingBox
		this.choiceWidth = (boundingBox[1][0] - boundingBox[0][0]) / texts.length
		this.selectedIndex = getValueDefault(selectedIndex, 0)
		this.texts = texts
	}
	drawPrivate(view) {
		clearFillBoundingBox(this.boundingBox, viewBroker.context)
		var left = this.boundingBox[0][0] + this.selectedIndex * this.choiceWidth
		drawChoiceButtonByWidth(this.boundingBox, '#ffff99', left, this.choiceWidth) // Canary
		drawChoiceTexts(this.boundingBox, this.texts, this.choiceWidth)
	}
	mouseDownPrivate(event, view) {
		this.selectedIndex = getSelectedIndexByWidth(event, this.boundingBox[0][0], this.texts, this.choiceWidth)
		this.drawPrivate(view)
		waitCallControlChanged(this, view)
	}
}

function clearBoundingBox(boundingBox, context) {
	var size = getSubtraction2D(boundingBox[1], boundingBox[0])
	context.clearRect(boundingBox[0][0], boundingBox[0][1], size[0], size[1])
}

function clearFillBoundingBox(boundingBox, context) {
	clearBoundingBox(boundingBox, context)
	context.fillStyle = '#f4f4f4'
	fillRoundRect(boundingBox[0][0] + 1, boundingBox[0][1] + 1, context, boundingBox[1][0] - 1, boundingBox[1][1] - 1)
	context.lineWidth = 1.0
	context.strokeStyle = 'black'
	strokeRoundRect(boundingBox[0][0] + 1, boundingBox[0][1] + 1, context, boundingBox[1][0] - 1, boundingBox[1][1] - 1)
}

function controlIsAnalysisName(control, view) {
	return control.display != false && getSelectedName(view.analysisControl) == control.name
}

function drawAnalysisControls(control, view) {
	drawControls(view.analysisControls, view)
}

function drawArray(context, element, x, y) {
	if (Array.isArray(element)) {
		if (element.length > 0) {
			var text = element[0]
			for (var parameterIndex = 1; parameterIndex < element.length; parameterIndex++) {
				text += ', ' + element[parameterIndex]
			}
			context.fillText(text, x, y)
		}
		return
	}
	context.fillText(element, x, y)
}

function drawArrays(context, elements, textSpace, x, y) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		var element = elements[elementIndex]
		if (Array.isArray(element)) {
			if (element.length > 0) {
				var text = element[0]
				for (var parameterIndex = 1; parameterIndex < element.length; parameterIndex++) {
					text += ', ' + element[parameterIndex]
				}
				context.fillText(text, x, y)
			}
		}
		else {
			context.fillText(element, x, y)
		}
		y += textSpace
	}
}

function drawByGeneratorName(controls, generatorName, view) {
	for (var control of controls) {
		if (control.generatorName == generatorName) {
			control.draw(view)
		}
	}
}

function drawChoiceButtonByWidth(boundingBox, fillStyle, left, width) {
	var context = viewBroker.context
	var beginX = left + 2
	var beginY = boundingBox[0][1] + 2
	var endX = left + width - 2
	var endY = boundingBox[1][1] - 2
	context.fillStyle = fillStyle
	fillRoundRect(beginX, beginY, context, endX, endY)
	context.lineWidth = 1.0
	context.strokeStyle = 'green'
	strokeRoundRect(beginX, beginY, context, endX, endY)
}

function drawChoiceTexts(boundingBox, texts, width) {
	setTextContext(viewBroker.context, 'center')
	var textOffsetX = boundingBox[0][0] + width * 0.5
	for (var textIndex = 0; textIndex < texts.length; textIndex++) {
		var text = texts[textIndex]
		viewBroker.context.fillText(text, width * textIndex + textOffsetX, boundingBox[1][1] - viewBroker.textControlLift)
	}
}

function drawControls(controls, view) {
	for (var control of controls) {
		control.draw(view)
	}
}

function drawControlSlider(control, view) {
	if (control.drawParent != undefined) {
		control = control.drawParent
	}

	control.draw(view)
	if (control.controlChanged != undefined) {
		control.controlChanged(control, view)
	}
}

function drawControlSliderReset(control, view) {
	drawControlSlider(control, view)
	viewBroker.mouseDownCenterOffset = undefined
	viewBroker.mouseDown2D = undefined
	viewBroker.mouseMoveManipulator = undefined
}

function drawControlText(boundingBox, text) {
	var context = viewBroker.context
	clearFillBoundingBox(boundingBox, context)
	setTextContext(context, 'center')
	context.fillText(text, 0.5 * (boundingBox[0][0] + boundingBox[1][0]), boundingBox[1][1] - viewBroker.textControlLift)
}

function drawLine(context, begin, end) {
	context.beginPath()
	moveToPoint(context, begin)
	lineToPoint(context, end)
	context.stroke()
}

function drawLines(context, points, pointLength) {
	pointLength = getValueDefault(pointLength, points.length)
	for (var vertexIndex = 0; vertexIndex < pointLength; vertexIndex++) {
		drawLine(context, points[vertexIndex], points[(vertexIndex + 1) % points.length])
	}
}

function drawHorizontalBarThumb(barRadius, left, thumbRadius, right, thumbLeft, y) {
	var context = viewBroker.context
	var x = thumbLeft + thumbRadius
	context.beginPath()
	context.arc(left + barRadius, y, barRadius, 0.5 * Math.PI, -0.5 * Math.PI)
	context.lineTo(x, y - barRadius)
	context.lineTo(x, y + barRadius)
	context.closePath()

	context.fillStyle = '#f0c32e'
	context.fill()
	context.beginPath()
	context.arc(right - barRadius, y, barRadius, -0.5 * Math.PI, 0.5 * Math.PI)
	context.lineTo(x, y + barRadius)
	context.lineTo(x, y - barRadius)
	context.closePath()

	context.fillStyle = '#c0c0c0'
	context.fill()
	context.beginPath()
	context.arc(x, y, thumbRadius, 0.0, gDoublePi)
	context.closePath()
	context.fillStyle = 'green'
	context.fill()
}

function drawNumericArray(context, element, x, y, decimalPlaces) {
	decimalPlaces = getValueDefault(decimalPlaces, 0)
	if (Array.isArray(element)) {
		if (element.length > 0) {
			var text = getSignificant(decimalPlaces, element[0])
			for (var parameterIndex = 1; parameterIndex < element.length; parameterIndex++) {
				text += ', ' + getSignificant(decimalPlaces, element[parameterIndex])
			}
			context.fillText(text, x, y)
		}
		return
	}
	context.fillText(getSignificant(decimalPlaces, element), x, y)
}

function drawNumericArrays(context, elements, textSpace, x, y, decimalPlaces) {
	for (var element of elements) {
		drawNumericArray(context, element, x, y, decimalPlaces)
		y += textSpace
	}
}

function drawTextBeforeAfter(context, textBefore, textAfter, x, y) {
	setTextContext(context, 'right')
	context.fillText(textBefore, x, y)
	context.textAlign = 'left'
	context.fillText(textAfter, x + viewBroker.halfTextSpace, y)
}

function drawVerticalBar(bottom, radius, top, x, y) {
	var context = viewBroker.context
	context.beginPath()
	context.arc(x, top + radius, radius, -Math.PI, 0.0)
	context.lineTo(x + radius, y)
	context.lineTo(x - radius, y)
	context.closePath()
	context.fillStyle = '#c0c0c0'
	context.fill()

	context.beginPath()
	context.arc(x, bottom - radius, radius, 0.0, Math.PI)
	context.lineTo(x - radius, y)
	context.lineTo(x + radius, y)
	context.closePath()
	context.fillStyle = '#f0c32e'
	context.fill()
}

function exportCanvasAsPNG() {
	exportImageData(getImageDataByBoundingBox(viewBroker.view.viewBoundingBox))
}

function exportClippedCanvasAsPNG() {
	var boundingBox = viewBroker.view.viewBoundingBox
	var imageData = getImageDataByBoundingBox(boundingBox)
	var lowerPoint = [Number.MAX_VALUE, Number.MAX_VALUE]
	var upperPoint = [-Number.MAX_VALUE, -Number.MAX_VALUE]
	var cellIndex = 0
	for (var y = 0; y < imageData.height; y++) {
		for (var x = 0; x < imageData.width; x++) {
			if (imageData.data[cellIndex] != 0) {
				lowerPoint[0] = Math.min(lowerPoint[0], x)
				lowerPoint[1] = Math.min(lowerPoint[1], y)
				upperPoint[0] = Math.max(upperPoint[0], x)
				upperPoint[1] = Math.max(upperPoint[1], y)
			}
			cellIndex += 4
		}
	}

	boundingBox[1] = getAddition2D(boundingBox[0], upperPoint)
	boundingBox[0] = getAddition2D(boundingBox[0], lowerPoint)
	exportImageData(getImageDataByBoundingBox(boundingBox))
}

function exportImageData(imageData) {
	var temporaryCanvas = document.createElement('canvas')
	temporaryCanvas.width = imageData.width
	temporaryCanvas.height = imageData.height
	var temporaryContext = temporaryCanvas.getContext('2d')
	temporaryContext.putImageData(imageData, 0, 0)
	temporaryCanvas.toBlob(function(blob) {saveAs(blob, viewBroker.view.id + '.png')})
}

function fillRoundRect(beginX, beginY, context, endX, endY, outset) {
	roundRectPath(beginX, beginY, context, endX, endY, outset)
	context.fill()
}

function getControlValue(control, value) {
	if (control.valueFunction == undefined) {
		return value
	}

	return control.valueFunction(value)
}

function getExponentialZoom() {
	return Math.pow(10.0, viewBroker.view.zoomControl.value)
}

function getHeightMinusOverZoom() {
	return 0.9 * viewBroker.halfHeightMinus / getExponentialZoom()
}

function getImageDataByBoundingBox(boundingBox) {
	wordscapeViewDraw()
	var oldCanvas = viewBroker.canvas
	var oldContext = viewBroker.context
	viewBroker.canvas = document.createElement('canvas')
	viewBroker.canvas.width = oldCanvas.width
	viewBroker.canvas.height = oldCanvas.height
	viewBroker.context = viewBroker.canvas.getContext('2d')
	var view = viewBroker.view
	if (view != null) {
		view.draw()
	}

	var size = getSubtraction2D(boundingBox[1], boundingBox[0])
	var imageData = viewBroker.context.getImageData(boundingBox[0][0], boundingBox[0][1], size[0], size[1])
	viewBroker.canvas = oldCanvas
	viewBroker.context = oldContext
	return imageData
}

function getIntegerStep(step) {
	var powerTen = Math.pow(10.0, Math.floor(Math.log10(step) + gClose))
	step = Math.round(step / powerTen)
	if (step < 2.0) {
		return 2.0 * powerTen
	}

	if (step < 5.0) {
		return 5.0 * powerTen
	}

	return 10.0 * powerTen
}

function getMouseMovement(event) {
	if (viewBroker.mouseDown2D == undefined) {
		return undefined
	}

	var mouseMovement = [event.offsetX - viewBroker.mouseDown2D[0], event.offsetY - viewBroker.mouseDown2D[1]]
	if (mouseMovement[0] == 0.0 && mouseMovement[1] == 0.0) {
		return undefined
	}

	return getMouseMovementShifted(event, mouseMovement)
}

function getMouseMovementFlipped(event) {
	if (viewBroker.mouseDown2D == undefined) {
		return undefined
	}

	var mouseMovementFlipped = [event.offsetX - viewBroker.mouseDown2D[0], viewBroker.mouseDown2D[1] - event.offsetY]
	if (mouseMovementFlipped[0] == 0.0 && mouseMovementFlipped[1] == 0.0) {
		return undefined
	}

	return getMouseMovementShifted(event, mouseMovementFlipped)
}

function getMouseMovementShifted(event, mouseMovement) {
	if (event.shiftKey) {
		if (Math.abs(mouseMovement[0]) > Math.abs(mouseMovement[1])) {
			mouseMovement[1] = 0.0 
		}
		else {
			mouseMovement[0] = 0.0 
		}
	}
	return mouseMovement
}

function getRangeZ(points) {
	var rangeZ = {upperZ:points[0][2]}
	rangeZ.lowerZ = rangeZ.upperZ
	for (var pointIndex = 1; pointIndex < points.length; pointIndex++) {
		var z = points[pointIndex][2]
		rangeZ.lowerZ = Math.min(rangeZ.lowerZ, z)
		rangeZ.upperZ = Math.max(rangeZ.upperZ, z)
	}

	rangeZ.differenceZ = rangeZ.upperZ - rangeZ.lowerZ
	return rangeZ
}

function getSelectedIndexByWidth(event, left, texts, width) {
	return getBoundedValue(Math.floor((event.offsetX - left) / width), 0, texts.length - 1)
}

function getSelectedName(control) {
	return control.texts[control.selectedIndex]
}

function getSelectedNameByParent(parent) {
	return parent.control.texts[parent.selectedIndex]
}

function getSVGContext() {
	wordscapeViewDraw()
	var oldContext = viewBroker.context
	svgContext.initialize()
	viewBroker.context = svgContext
	var view = viewBroker.view
	view.viewControl.draw(view)
	viewBroker.context = oldContext
	return svgContext
}

function getTitleEndX(lower, upper) {
	return 0.5 * (lower + upper)
}

class HorizontalSlider extends CanvasControl {
	constructor(boundingBox, lower, text, upper, value) {
		super()
		this.width = boundingBox[1][1] - boundingBox[0][1]
		setHorizontalSlider(this, lower, text, upper, value)
		this.resize(boundingBox)
	}
	drawPrivate(view) {
		var boundingBox = this.boundingBox
		var context = viewBroker.context
		var thumbLeft = this.rangeLeft + this.rangeOverValue * (this.value - this.lower)
		clearFillBoundingBox(boundingBox, context)
		setTextContext(context)
		context.fillText(this.text, boundingBox[0][0] + viewBroker.halfTextSpace, boundingBox[1][1] - viewBroker.textControlLift)
		drawHorizontalBarThumb(this.barRadius, this.rangeLeft, this.thumbRadius, this.rangeRight, thumbLeft, this.midY)
	}
	mouseDownPrivate(event, view) {
		mouseDownHorizontalSlider(this, view)
	}
	resize(boundingBox) {
		resizeHorizontalSlider(boundingBox, this)
		this.midY = 0.5 * (boundingBox[0][1] + boundingBox[1][1])
	}
}

var horizontalSliderManipulator = {
	mouseMove: function(event) {
		this.control.value = this.control.mouseDownValue + (event.offsetX - viewBroker.mouseDown2D[0]) / this.control.rangeOverValue
		boundDrawControlSlider(this.control, this.view)
	},
	mouseOut: function(event) {
		this.control.value = this.control.mouseDownValue
		drawControlSliderReset(this.control, this.view)
	},
	mouseUp: function(event) {
		drawControlSliderReset(this.control, this.view)
	}
}

class HorizontalSliderPoint extends CanvasControl {
	constructor(boundingBox, lower, text, upper, point) {
		super()
		this.width = viewBroker.controlWidth
		point = getValueDefault(point, [lower, lower])
		lower = Math.min(lower, Math.min(point[0], point[1]))
		upper = Math.max(upper, Math.max(point[0], point[1]))
		this.sliders = new Array(2)
		for (var sliderIndex = 0; sliderIndex < this.sliders.length; sliderIndex++) {
			this.sliders[sliderIndex] = {drawParent:this, oldLower:lower, oldUpper:upper, value:point[sliderIndex], width:this.width}
		}

		this.text = text
		this.resize(boundingBox)
	}
	static defaultHeightNew() {
		return viewBroker.wideHeight + viewBroker.controlWidth
	}
	resize(boundingBox) {
		this.boundingBox = boundingBox
		var top = boundingBox[0][1] + viewBroker.textSpace
		var sliderHeight = 1.0 * (boundingBox[1][1] - top) / this.sliders.length
		for (var slider of this.sliders) {
			var nextTop = top + sliderHeight
			resizeHorizontalSlider([[boundingBox[0][0], top], [boundingBox[1][0], nextTop]], slider)
			slider.midY = (top + nextTop) * 0.5
			top = nextTop
		}

		this.titleEndX = getTitleEndX(boundingBox[0][0], boundingBox[1][0])
		this.textY = boundingBox[0][1] + viewBroker.textSpace
	}
	drawPrivate(view) {
		var boundingBox = this.boundingBox
		var context = viewBroker.context
		clearFillBoundingBox(boundingBox, context)
		var valueStrings = []
		for (var slider of this.sliders) {
			var thumbLeft = slider.rangeLeft + slider.rangeOverValue * (slider.value - slider.lower)
			drawHorizontalBarThumb(slider.barRadius, slider.rangeLeft, slider.thumbRadius, slider.rangeRight, thumbLeft, slider.midY)
			valueStrings.push(getControlValue(this, slider.value).toFixed(getValueDefault(this.decimalPlaces, 0)))
		}

		drawTextBeforeAfter(context, this.text, valueStrings.join(', '), this.titleEndX, this.textY)

	}
	mouseDownPrivate(event, view) {
		for (var slider of this.sliders) {
			var sliderBox = slider.boundingBox
			var mouseY = viewBroker.mouseDown2D[1]
			if (mouseY < sliderBox[1][1] && mouseY > sliderBox[0][1]) {
				mouseDownHorizontalSlider(slider, view)
			}
		}
	}
}

class HorizontalSliderWide extends CanvasControl {
	constructor(boundingBox, lower, text, upper, value) {
		super()
		this.width = viewBroker.controlWidth
		setHorizontalSlider(this, lower, text, upper, value)
		this.resize(boundingBox)
	}
	static defaultHeightNew() {
		return viewBroker.wideHeight
	}
	resize(boundingBox) {
		resizeHorizontalSlider(boundingBox, this)
		this.midY = boundingBox[1][1] - 0.5 * this.width
		this.titleEndX = getTitleEndX(boundingBox[0][0], boundingBox[1][0])
		this.textY = boundingBox[0][1] + viewBroker.textSpace
	}
	drawPrivate(view) {
		var boundingBox = this.boundingBox
		var context = viewBroker.context
		var thumbLeft = this.rangeLeft + this.rangeOverValue * (this.value - this.lower)
		clearFillBoundingBox(boundingBox, context)
		drawHorizontalBarThumb(this.barRadius, this.rangeLeft, this.thumbRadius, this.rangeRight, thumbLeft, this.midY)
		var decimalPlaces = getValueDefault(this.decimalPlaces, 0)
		drawTextBeforeAfter(context, this.text, getControlValue(this, this.value).toFixed(decimalPlaces), this.titleEndX, this.textY)
	}
	mouseDownPrivate(event, view) {
		mouseDownHorizontalSlider(this, view)
	}
}

function lineToPoint(context, point) {
	context.lineTo(point[0], point[1])
}

function moveToPoint(context, point) {
	context.moveTo(point[0], point[1])
}

function mouseDownControls(controls, event, view) {
	for (var control of controls) {
		control.mouseDown(event, view)
	}
}

function mouseDownHorizontalSlider(control, view) {
	var thumbLeft = control.rangeLeft + control.rangeOverValue * (control.value - control.lower)
	var mouseDownX = viewBroker.mouseDown2D[0]
	if (mouseDownX < thumbLeft || mouseDownX > thumbLeft + control.thumbDiameter) {
		return
	}

	control.mouseDownValue = control.value
	horizontalSliderManipulator.control = control
	horizontalSliderManipulator.view = view
	viewBroker.mouseMoveManipulator = horizontalSliderManipulator
}

function outputCanvasAsSVG() {
	if (viewBroker.view == null) {
		return
	}

	addOutputArea(getSVGContext().getText(), 'View SVG - ' + viewBroker.view.id)
}

function outputCenteredCanvasAsSVG() {
	if (viewBroker.view == null) {
		return
	}

	addOutputArea(getSVGContext().getCenteredText(), 'View Centered SVG - ' + viewBroker.view.id)
}

function removeByGeneratorName(elements, generatorName) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (elements[elementIndex].generatorName == generatorName) {
			elements[elementIndex] = null
		}
	}

	removeNulls(elements)
}

function resizeHorizontalSlider(boundingBox, control) {
	control.boundingBox = boundingBox
	control.barRadius = 0.15 * control.width
	var columnSpace = 0.5 * control.width - control.barRadius
	control.thumbDiameter = control.width - columnSpace
	control.thumbRadius = 0.5 * control.thumbDiameter
	control.rangeRight = boundingBox[1][0] - columnSpace
	control.rangeLeft = boundingBox[0][0] + columnSpace
	var rangeLength = Math.round(control.rangeRight - control.thumbDiameter - control.rangeLeft)
	var upperMinusLower = control.oldUpper - control.oldLower
	var integerStep = getIntegerStep(upperMinusLower / rangeLength)
	var integerSpan = integerStep * rangeLength
	control.halfStepClose = integerStep * 0.5 + gClose
	if (control.oldLower * control.oldUpper > 0.0) {
		control.lower = control.oldLower
	}
	else {
		control.lower = (control.oldLower + control.oldUpper - integerSpan) * 0.5
	}

	control.lower = Math.round(control.lower / integerStep) * integerStep
	control.upper = control.lower + integerSpan
	upperMinusLower = control.upper - control.lower
	control.rangeOverValue = rangeLength / upperMinusLower
}

function roundRectPath(beginX, beginY, context, endX, endY, outset) {
	outset = getValueDefault(outset, 8)
	context.beginPath()
	context.arc(endX - outset, beginY + outset, outset, -0.5 * Math.PI, 0.0)
	context.lineTo(endX, endY - outset)
	context.arc(endX - outset, endY - outset, outset, 0.0, 0.5 * Math.PI)
	context.lineTo(beginX + outset, endY)
	context.arc(beginX + outset, endY - outset, outset, 0.5 * Math.PI, Math.PI)
	context.lineTo(beginX, beginY + outset)
	context.arc(beginX + outset, beginY + outset, outset, Math.PI, 1.5 * Math.PI)
	context.closePath()
}

function setHorizontalSlider(control, lower, text, upper, value) {
	control.value = getValueDefault(value, lower)
	control.oldLower = Math.min(lower, control.value)
	control.oldUpper = Math.max(upper, control.value)
	control.text = text
}

function setTextContext(context, textAlign) {
	textAlign = getValueDefault(textAlign, 'left')
	context.font = viewBroker.textHeight.toString() + 'px freeserif,Palatino'
	context.fillStyle = 'black'
	context.textAlign = textAlign
}

function strokeRoundRect(beginX, beginY, context, endX, endY, outset) {
	roundRectPath(beginX, beginY, context, endX, endY, outset)
	context.stroke()
}

var svgContext = {
	beginPath: function() {
		this.tag = '<polyline'
		this.shape = {points:[], tag:'<polyline'}
	},
	clearRect: function() {
	},
	clip: function() {
	},
	closePath: function() {
		this.tag = '<polygon'
		this.shape.tag = '<polygon'
	},
	fill: function() {
		this.shape.style = '" stroke-width="' + this.lineWidth.toString() + '" style="fill:' + this.fillStyle + ';stroke-opacity:0.0"/>'
		this.shapes.push(this.shape)
	},
	getBoundingBox: function() {
		var boundingBox = [[Number.MAX_VALUE, Number.MAX_VALUE], [-Number.MAX_VALUE, -Number.MAX_VALUE]]
		for (var shape of this.shapes) {
			for (var point of shape.points) {
				widenBoundingBox(boundingBox, point)
			}
		}

		return boundingBox
	},
	getCenteredText: function() {
		var boundingBox = this.getBoundingBox()
		var center = multiply2DScalar(getAddition2D(boundingBox[0], boundingBox[1]), 0.5)
		subtract2Ds(boundingBox, center)
		for (var shape of this.shapes) {
			subtract2Ds(shape.points, center)
		}

		return this.getTextByBoundingBox(boundingBox)
	},
	getText: function() {
		return this.getTextByBoundingBox(this.getBoundingBox())
	},
	getTextByBoundingBox: function(boundingBox) {
		var svgLines = new Array(this.shapes.length + 2)
		var size = getSubtraction2D(boundingBox[1], boundingBox[0])
		pointsToFixed(boundingBox)
		svgLines[0] = '<g boundingBox="' + boundingBox.join(' ') + '" size="' + getFixedStrings(size).join(',') + '">'
		for (var shapeIndex = 0; shapeIndex < this.shapes.length; shapeIndex++) {
			var shape = this.shapes[shapeIndex]
			pointsToFixed(shape.points)
			svgLines[shapeIndex + 1] = shape.tag + ' points="' + shape.points.join(' ') + shape.style
		}

		svgLines[svgLines.length - 1] = '</g>'
		return svgLines.join('\n')
	},
	initialize: function() {
		this.fillStyle = 'black'
		this.strokeStyle = 'black'
		this.lineWidth = 1.0
		this.shapes = []
	},
	lineTo: function(x, y) {
		this.shape.points.push([x, y])
	},
	moveTo: function(x, y) {
		this.shape.points.push([x, y])
	},
	restore: function() {
	},
	save: function() {
	},
	stroke: function() {
		this.shape.style = '" stroke-width="' + this.lineWidth.toString() + '" style="fill:none;stroke:' + this.strokeStyle + '"/>'
		this.shapes.push(this.shape)
	}
}

class TableChoice extends CanvasControl {
	constructor(boundingBox, texts, numberOfRows, selectedIndex) {
		super()
		this.boundingBox = boundingBox
		this.numberOfRows = getValueDefault(numberOfRows, 2)
		this.selectedIndex = getValueDefault(selectedIndex, 0)
		this.boundingBoxes = new Array(numberOfRows)
		this.choiceWidths = new Array(numberOfRows)
		this.rowTextArrays = new Array(numberOfRows)
		this.texts = texts
		var left = boundingBox[0][0]
		var right = boundingBox[1][0]
		var top = boundingBox[0][1]
		var oneOverRows = 1.0 / numberOfRows
		this.rowHeight = (boundingBox[1][1] - top) * oneOverRows
		var rowTextFloat = 1.0 * texts.length * oneOverRows
		var sliceBegin = 0
		for (var rowIndex = 0; rowIndex < numberOfRows; rowIndex++) {
			var nextSliceIndex = Math.round((rowIndex + 1) * rowTextFloat)
			var nextTop = top + this.rowHeight
			this.boundingBoxes[rowIndex] = [[left, top], [right, nextTop]]
			var rowTexts = texts.slice(sliceBegin, nextSliceIndex)
			this.rowTextArrays[rowIndex] = rowTexts
			this.choiceWidths[rowIndex] = (boundingBox[1][0] - boundingBox[0][0]) / rowTexts.length
			sliceBegin = nextSliceIndex
			top = nextTop
		}

		return this
	}
	drawPrivate(view) {
		clearFillBoundingBox(this.boundingBox, viewBroker.context)
		var rowSelectedIndex = this.selectedIndex
		for (var rowIndex = 0; rowIndex < this.numberOfRows; rowIndex++) {
			var choiceWidth = this.choiceWidths[rowIndex]
			var rowBoundingBox = this.boundingBoxes[rowIndex]
			var rowTexts = this.rowTextArrays[rowIndex]
			if (rowSelectedIndex >= 0 && rowSelectedIndex < rowTexts.length) {
				var left = rowBoundingBox[0][0] + rowSelectedIndex * choiceWidth
				drawChoiceButtonByWidth(rowBoundingBox, '#f0ffff', left, choiceWidth)
			}
			drawChoiceTexts(rowBoundingBox, rowTexts, choiceWidth)
			rowSelectedIndex -= rowTexts.length
		}
	}
	mouseDownPrivate(event, view) {
		var left = this.boundingBox[0][0]
		var rowSelected = getBoundedValue(Math.floor((event.offsetY - this.boundingBox[0][1]) / this.rowHeight), 0, this.numberOfRows)
		this.selectedIndex = getSelectedIndexByWidth(event, left, this.rowTextArrays[rowSelected], this.choiceWidths[rowSelected])
		for (var rowIndex = 0; rowIndex < rowSelected; rowIndex++) {
			this.selectedIndex += this.rowTextArrays[rowIndex].length
		}

		this.drawPrivate(view)
		waitCallControlChanged(this, view)
	}
}

function toggleView() {
	toggleSessionBoolean('isViewHidden@')
	updateView()
}

function updateView() {
	var isViewHidden = !getSessionBoolean('isViewHidden@')
	if (viewBroker.view != null) {
		if (viewBroker.view.updateView != undefined) {
			viewBroker.view.updateView(isViewHidden)
		}
	}

	document.getElementById('viewSelectID').hidden = isViewHidden
	setOthersMenuLine(isViewHidden, document.getElementById('viewMenuSelectID'))
}

class VerticalScrollBar extends CanvasControl {
	constructor(boundingBox, lower, span, upper, value) {
		super()
		value = getValueDefault(value, lower)
		this.lower = Math.min(lower, value)
		this.upper = Math.max(upper, value)
		this.boundingBox = boundingBox
		this.span = span
		this.value = value
		this.width = boundingBox[1][0] - boundingBox[0][0]
		this.barRadius = 0.15 * this.width
		var columnSpace = 0.5 * this.width - this.barRadius
		this.midX = 0.5 * (this.boundingBox[0][0] + this.boundingBox[1][0])
		this.thumbDiameter = this.width - columnSpace
		this.thumbRadius = 0.5 * this.thumbDiameter
		this.rangeBottom = boundingBox[1][1] - columnSpace
		var upperMinusLower = (this.upper - this.lower)
		var upperSpanMinus = upperMinusLower + span
		this.barTop = boundingBox[0][1] + columnSpace
		var barNegativeHeight = this.barTop - this.rangeBottom + this.thumbDiameter
		var barLowerHeight = barNegativeHeight * upperMinusLower / upperSpanMinus
		this.thumbNegativeHeight = barNegativeHeight * span / upperSpanMinus
		this.thumbNegativeOuter = this.thumbNegativeHeight - this.thumbDiameter
		this.rangeOverValue = barLowerHeight / upperMinusLower
	}
	drawPrivate(view) {
		var context = viewBroker.context
		var thumbY = this.rangeBottom - this.thumbRadius + this.rangeOverValue * (this.value - this.lower)
		clearFillBoundingBox(this.boundingBox, context)
		drawVerticalBar(this.rangeBottom, this.barRadius, this.barTop, this.midX, thumbY)
		context.beginPath()
		context.arc(this.midX, thumbY + this.thumbNegativeHeight, this.thumbRadius, -Math.PI, 0.0)
		context.arc(this.midX, thumbY, this.thumbRadius, 0.0, Math.PI)
		context.closePath()
		context.fillStyle = 'green'
		context.fill()
	}
	mouseDownPrivate(event, view) {
		var thumbLower = this.rangeBottom + this.rangeOverValue * (this.value - this.lower)
		var mouseDownY = viewBroker.mouseDown2D[1]
		if (mouseDownY < thumbLower + this.thumbNegativeOuter || mouseDownY > thumbLower) {
			return
		}

		this.mouseDownValue = this.value
		verticalSliderManipulator.control = this
		verticalSliderManipulator.view = view
		viewBroker.mouseMoveManipulator = verticalSliderManipulator
	}

}

class VerticalSlider extends CanvasControl {
	constructor(boundingBox, lower, text, upper, value) {
		super()
		value = getValueDefault(value, lower)
		this.lower = Math.min(lower, value)
		this.upper = Math.max(upper, value)
		this.boundingBox = boundingBox
		this.text = text
		this.value = value
		this.width = boundingBox[1][0] - boundingBox[0][0]
		this.barRadius = 0.15 * this.width
		var columnSpace = 0.5 * this.width - this.barRadius
		this.midX = 0.5 * (this.boundingBox[0][0] + this.boundingBox[1][0])
		this.thumbDiameter = this.width - columnSpace
		this.thumbRadius = 0.5 * this.thumbDiameter
		this.rangeBottom = boundingBox[1][1] - this.width
		this.barTop = boundingBox[0][1] + columnSpace
		this.rangeOverValue = (this.barTop - this.rangeBottom + this.thumbDiameter) / (this.upper - this.lower)
		return this
	}
	drawPrivate(view) {
		var context = viewBroker.context
		var thumbY = this.rangeBottom - this.thumbRadius + this.rangeOverValue * (this.value - this.lower)
		drawControlText(this.boundingBox, this.text)
		drawVerticalBar(this.rangeBottom, this.barRadius, this.barTop, this.midX, thumbY)
		context.beginPath()
		context.arc(this.midX, thumbY, this.thumbRadius, 0.0, gDoublePi)
		context.closePath()
		context.fillStyle = 'green'
		context.fill()
	}
	mouseDownPrivate(event, view) {
		var thumbLower = this.rangeBottom + this.rangeOverValue * (this.value - this.lower)
		var mouseDownY = viewBroker.mouseDown2D[1]
		if (mouseDownY < thumbLower - this.thumbDiameter || mouseDownY > thumbLower) {
			return
		}

		this.mouseDownValue = this.value
		verticalSliderManipulator.control = this
		verticalSliderManipulator.view = view
		viewBroker.mouseMoveManipulator = verticalSliderManipulator
	}
}

var verticalSliderManipulator = {
	mouseMove: function(event) {
		this.control.value = this.control.mouseDownValue + (event.offsetY - viewBroker.mouseDown2D[1]) / this.control.rangeOverValue
		boundDrawControlSlider(this.control, this.view)
	},
	mouseOut: function(event) {
		this.control.value = this.control.mouseDownValue
		drawControlSliderReset(this.control, this.view)
	},
	mouseUp: function(event) {
		drawControlSliderReset(this.control, this.view)
	}
}

var viewBroker = {
	getOffsetNormal: function(event) {
		return normalize2D([event.offsetX - this.halfWidth, this.halfHeight - event.offsetY])
	},
	initialize: function() {
		this.canvasID = null
		this.controlWidth = 32
		this.minimumHeight = 256
		this.textHeight = 12
		this.textSpace = this.textHeight * 1.5
		this.halfTextSpace = this.textSpace * 0.5
		this.doubleTextSpace = this.textSpace + this.textSpace
		this.textControlLift = this.controlWidth * 0.5 - 0.4 * this.textHeight
		this.valueMap = new Map()
		this.viewID = null
		this.wideHeight = this.controlWidth + this.textSpace
	},
	setView: function(viewIndex) {
		if (this.view != null) {
			if (this.view.clearView != undefined) {
				this.view.clearView()
			}
		}

		this.view = this.registry.views[viewIndex]
		this.viewID = this.view.id
	},
	start: function(height, id, registry) {
		this.registry = registry
		var views = registry.views
		this.canvas = document.getElementById(id)
		this.canvas.height = height
		this.canvas.width = height + 20.0 * this.textHeight
		this.view = null
		if (views.length == 0) {
			return
		}

		this.context = this.canvas.getContext('2d')
		this.context.lineJoin = 'round'
		this.halfHeight = height / 2
		this.halfHeightMinus = this.halfHeight - this.controlWidth
		this.halfWidth = height / 2
		this.canvasCenter = [this.halfWidth, this.halfHeight]
		this.modelDiameter = height - 2.0 * this.controlWidth
		this.canvasCenterMatrix = getMatrix3DByTranslate(this.canvasCenter)
		this.rotationMultiplier = 720.0 / (2.0 + Math.PI) / this.modelDiameter
		var viewKeys = ['', 'Export Canvas As PNG', 'Export Clipped Canvas As PNG', 'Output Canvas As SVG', 'Output Centered Canvas As SVG']
		setSelectToKeysIndexTitle(document.getElementById('viewMenuSelectID'), viewKeys, 0, 'View')
		views.sort(compareIDAscending)
		var ids = new Array(views.length)
		for (var viewIndex = 0; viewIndex < views.length; viewIndex++) {
			ids[viewIndex] = views[viewIndex].id
		}

		var viewSelectedIndex = Math.max(ids.indexOf(this.viewID), 0)
		this.view = views[viewSelectedIndex]
		setSelectToKeysIndexTitle(document.getElementById('viewSelectID'), ids, viewSelectedIndex)
		this.setView(viewSelectedIndex)
		this.heightMinus = height - this.controlWidth
		this.analysisCharacterBegin = height + 0.5 * this.textHeight
		this.analysisSizeBegin = height + 2 * this.textHeight
		this.analysisLowerBegin = height + 7 * this.textHeight
		this.analysisUpperBegin = height + 12 * this.textHeight
		this.boundingBox = [[0, 0], [viewBroker.canvas.width, height]]
		for (var view of views) {
			view.start()
		}

		updateView()
		wordscapeViewDraw()
		if (id != this.canvasID) {
			this.canvasID = id
			this.canvas.addEventListener('mousedown', viewMouseDown)
			this.canvas.addEventListener('mousemove', viewMouseMove)
			this.canvas.addEventListener('mouseout', viewMouseOut)
			this.canvas.addEventListener('mouseup', viewMouseUp)
		}
	}
}

function viewMouseDown(event) {
	if (viewBroker.view != null) {
		viewBroker.mouseDown2D = [event.offsetX, event.offsetY]
		viewBroker.view.mouseDown(event)
	}
}

function viewMouseMove(event) {
	if (viewBroker.view != null) {
		viewBroker.view.mouseMove(event)
	}
}

function viewMouseOut(event) {
	if (viewBroker.view != null) {
		viewBroker.view.mouseOut(event)
	}
}

function viewMouseUp(event) {
	if (viewBroker.view != null) {
		viewBroker.view.mouseUp(event)
	}
}

function viewMenuSelectAction(viewMenuText) {
	if (viewMenuText.endsWith(' Others')) {
		toggleSessionBoolean('isViewHidden@')
		return
	}

	if (viewMenuText == 'Export Canvas As PNG') {
		exportCanvasAsPNG()
		return
	}

	if (viewMenuText == 'Export Clipped Canvas As PNG') {
		exportClippedCanvasAsPNG()
		return
	}

	if (viewMenuText == 'Output Canvas As SVG') {
		outputCanvasAsSVG()
	}

	if (viewMenuText == 'Output Centered Canvas As SVG') {
		outputCenteredCanvasAsSVG()
	}
}

function viewMenuSelectChanged() {
	var viewMenuSelect = document.getElementById('viewMenuSelectID')
	viewMenuSelectAction(viewMenuSelect.options[viewMenuSelect.selectedIndex].text)
	viewMenuSelect.selectedIndex = 0
	updateView()
}

function viewSelectChanged() {
	var viewSelect = document.getElementById('viewSelectID')
	viewBroker.setView(viewSelect.selectedIndex)
	updateView()
	clearBoundingBox(viewBroker.boundingBox, viewBroker.context)
	wordscapeViewDraw()
}

function waitCallControlChanged(control, view) {
	if (control.controlChanged != undefined) {
		// wait in order for the canvas to draw the control before calling function
		setTimeout(function() {control.controlChanged(control, view)}, 5)
	}
}

function wordscapeViewDraw() {
	if (viewBroker.view != null) {
		viewBroker.view.draw()
	}
}

viewBroker.initialize()
