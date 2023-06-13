//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function boundDrawControlSlider(control, viewer) {
	control.value = Math.max(control.value, control.lower)
	control.value = Math.min(control.value, control.upper)
	drawControlSlider(control, viewer)
}

function clearBoundingBox(boundingBox, context) {
	var size = getSubtraction2D(boundingBox[1], boundingBox[0])
	context.clearRect(boundingBox[0][0], boundingBox[0][1], size[0], size[1])
}

function clearBoundingBoxClip(boundingBox, context) {
	clearBoundingBox(boundingBox, context)
	context.save()
	var region = new Path2D()
	var size = getSubtraction2D(boundingBox[1], boundingBox[0])
	region.rect(boundingBox[0][0], boundingBox[0][1], size[0], size[1])
	context.clip(region)
}

function clearFillBoundingBox(boundingBox, context) {
	clearBoundingBox(boundingBox, context)
	context.fillStyle = '#f4f4f4'
	fillRoundRect(boundingBox[0][0] + 1, boundingBox[0][1] + 1, context, boundingBox[1][0] - 1, boundingBox[1][1] - 1)
	context.lineWidth = 1.0
	context.strokeStyle = 'black'
	strokeRoundRect(boundingBox[0][0] + 1, boundingBox[0][1] + 1, context, boundingBox[1][0] - 1, boundingBox[1][1] - 1)
}

function downloadCanvas() {
	var oldCanvas = viewBroker.canvas
	var oldContext = viewBroker.context
	viewBroker.canvas = document.createElement('canvas')
	viewBroker.canvas.width = oldCanvas.width
	viewBroker.canvas.height = oldCanvas.height
	viewBroker.context = viewBroker.canvas.getContext('2d')
	wordscapeViewerDraw()
	var boundingBox = viewBroker.view.controlBoundingBox
	var filename = viewBroker.view.id + '.png'
	var size = getSubtraction2D(boundingBox[1], boundingBox[0])
	var imageData = viewBroker.context.getImageData(boundingBox[0][0], boundingBox[0][1], size[0], size[1])
	viewBroker.canvas = oldCanvas
	viewBroker.context = oldContext
	var temporaryCanvas = document.createElement('canvas')
	temporaryCanvas.width = size[0]
	temporaryCanvas.height = size[1]
	var temporaryContext = temporaryCanvas.getContext('2d')
	temporaryContext.putImageData(imageData, 0, 0)
	temporaryCanvas.toBlob(function(blob) {saveAs(blob, filename)})
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

function drawCheckbox(control, viewer) {
	var boundingBox = control.boundingBox
	var context = viewBroker.context
	clearFillBoundingBox(boundingBox, context)
	var outset = 10
	var left = boundingBox[0][0] + 0.6 * outset
	var width = control.size[1] - 2 * outset
	var checkboxTop = boundingBox[0][1] + outset
	setTextContext(context)
	context.textAlign = 'center'
	context.fillText(control.text, 0.5 * (left + width + boundingBox[1][0]), boundingBox[1][1] - viewBroker.textControlLift)
	context.lineWidth = 1.0
	if (control.selectedState) {
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

function drawChoice(control, viewer) {
	var boundingBox = control.boundingBox
	var context = viewBroker.context
	clearFillBoundingBox(boundingBox, context)
	setTextContext(context)
	context.textAlign = 'center'
	for (var textIndex = 0; textIndex < control.texts.length; textIndex++) {
		var text = control.texts[textIndex]
		context.fillText(text, control.choiceWidth * (textIndex + 0.5), boundingBox[1][1] - viewBroker.textControlLift)
	}
	context.lineWidth = 1.0
	var left = boundingBox[0][0] + control.selectedIndex * control.choiceWidth
	strokeRoundRect(left + 2, boundingBox[0][1] + 2, context, left + control.choiceWidth - 2, boundingBox[1][1] - 2)
}

function drawControl(control, viewer) {
	if (control.text != undefined) {
		drawControlText(control.boundingBox, control.text)
	}
	if (control.draw != undefined) {
		control.draw(control, viewer)
	}
}

function drawControls(controls, viewer) {
	for (var control of controls) {
		drawControl(control, viewer)
	}
}

function drawControlSlider(control, viewer) {
	drawControl(control, viewer)
	if (control.controlChanged != undefined) {
		control.controlChanged(control, viewer)
	}
}

function drawControlSliderReset(control, viewer) {
	drawControlSlider(control, viewer)
	viewBroker.mouseDownCenterOffset = null
	viewBroker.mouseDown2D = null
	viewBroker.mouseMoveManipulator = null
}

function drawControlText(boundingBox, text) {
	var context = viewBroker.context
	clearFillBoundingBox(boundingBox, context)
	setTextContext(context)
	context.textAlign = 'center'
	context.fillText(text, 0.5 * (boundingBox[0][0] + boundingBox[1][0]), boundingBox[1][1] - viewBroker.textControlLift)
}

function drawHorizontalSlider(control, viewer) {
	var boundingBox = control.boundingBox
	var context = viewBroker.context
	var thumbLeft = control.barRight + control.rangeOverValue * (control.value - control.lower)
	var thumbX = thumbLeft + control.thumbRadius
	clearFillBoundingBox(boundingBox, context)
	setTextContext(context)
	context.textAlign = 'left'
	context.fillText(control.horizontalText, boundingBox[0][0] + 0.5 * viewBroker.textSpace, boundingBox[1][1] - viewBroker.textControlLift)

	context.beginPath()
	context.arc(control.barRight + control.barRadius, control.midY, control.barRadius, 0.5 * Math.PI, -0.5 * Math.PI)
	context.lineTo(thumbX, control.midY - control.barRadius)
	context.lineTo(thumbX, control.midY + control.barRadius)
	context.closePath()
	context.fillStyle = '#f0c32e'
	context.fill()

	context.beginPath()
	context.arc(control.rangeRight - control.barRadius, control.midY, control.barRadius, -0.5 * Math.PI, 0.5 * Math.PI)
	context.lineTo(thumbX, control.midY + control.barRadius)
	context.lineTo(thumbX, control.midY - control.barRadius)
	context.closePath()
	context.fillStyle = '#c0c0c0'
	context.fill()

	context.beginPath()
	context.arc(thumbX, control.midY, control.thumbRadius, 0.0, gDoublePi)
	context.closePath()
	context.fillStyle = 'green'
	context.fill()
}

function drawHorizontalSliderWide(control, viewer) {
	var boundingBox = control.boundingBox
	var context = viewBroker.context
	var thumbLeft = control.barRight + control.rangeOverValue * (control.value - control.lower)
	var thumbX = thumbLeft + control.thumbRadius
	clearFillBoundingBox(boundingBox, context)
	setTextContext(context)
	context.textAlign = 'right'
	var textY = 0.5 * (boundingBox[0][1] + boundingBox[1][1]) + viewBroker.textHeight - viewBroker.textSpace
	context.fillText(control.horizontalText, control.titleEndX, textY)

	var decimalPlaces = getValueByDefault(0, control.decimalPlaces)
	var value = control.value
	if (control.valueFunction != undefined) {
		value = control.valueFunction(value)
	}
	context.textAlign = 'left'
	context.fillText(value.toFixed(decimalPlaces), control.variableBeginX, textY)

	context.beginPath()
	context.arc(control.barRight + control.barRadius, control.midY, control.barRadius, 0.5 * Math.PI, -0.5 * Math.PI)
	context.lineTo(thumbX, control.midY - control.barRadius)
	context.lineTo(thumbX, control.midY + control.barRadius)
	context.closePath()
	context.fillStyle = '#f0c32e'
	context.fill()

	context.beginPath()
	context.arc(control.rangeRight - control.barRadius, control.midY, control.barRadius, -0.5 * Math.PI, 0.5 * Math.PI)
	context.lineTo(thumbX, control.midY + control.barRadius)
	context.lineTo(thumbX, control.midY - control.barRadius)
	context.closePath()
	context.fillStyle = '#c0c0c0'
	context.fill()

	context.beginPath()
	context.arc(thumbX, control.midY, control.thumbRadius, 0.0, gDoublePi)
	context.closePath()
	context.fillStyle = 'green'
	context.fill()
}

function drawNumericArray(context, element, x, y, decimalPlaces) {
	decimalPlaces = getValueByDefault(0, decimalPlaces)
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

function drawOutsetLine(begin, context, end, outset) {
	var beginEnd = getSubtraction2D(end, begin)
	var beginEndLength = length2D(beginEnd)
	if (beginEndLength == 0.0) {
		return
	}
	multiply2DScalar(beginEnd, outset / beginEndLength)
	var right = [beginEnd[1], -beginEnd[0]]
	var left = [-right[0], -right[1]]
	var endBegin = [-beginEnd[0], -beginEnd[1]]
	var beginOutset = getAddition2D(begin, endBegin)
	var endOutset = getAddition2D(end, beginEnd)
	context.beginPath()
	moveToPoint(context, getAddition2D(beginOutset, left))
	lineToPoint(context, getAddition2D(beginOutset, right))
	lineToPoint(context, getAddition2D(endOutset, right))
	lineToPoint(context, getAddition2D(endOutset, left))
	context.closePath()
	context.fill()
}

function drawVerticalSlider(control, viewer) {
	var context = viewBroker.context
	var thumbUpper = control.thumbTop + control.rangeOverValue * (control.value - control.lower)
	var thumbY = thumbUpper + control.thumbRadius

	context.beginPath()
	context.arc(control.midX, control.barTop + control.barRadius, control.barRadius, -Math.PI, 0.0)
	context.lineTo(control.midX + control.barRadius, thumbY)
	context.lineTo(control.midX - control.barRadius, thumbY)
	context.closePath()
	context.fillStyle = '#c0c0c0'
	context.fill()

	context.beginPath()
	context.arc(control.midX, control.rangeBottom - control.barRadius, control.barRadius, 0.0, Math.PI)
	context.lineTo(control.midX - control.barRadius, thumbY)
	context.lineTo(control.midX + control.barRadius, thumbY)
	context.closePath()
	context.fillStyle = '#f0c32e'
	context.fill()

	context.beginPath()
	context.arc(control.midX, thumbY, control.thumbRadius, 0.0, gDoublePi)
	context.closePath()
	context.fillStyle = 'green'
	context.fill()
}

function fillRoundRect(beginX, beginY, context, endX, endY, outset) {
	roundRectPath(beginX, beginY, context, endX, endY, outset)
	context.fill()
}

function getCheckbox(boundingBox, text, selectedState) {
	selectedState = getValueByDefault(true, selectedState)
	var control = {boundingBox:boundingBox, draw:drawCheckbox, mouseDown:mouseDownCheckbox, selectedState:selectedState, text:text}
	control.size = getSubtraction2D(boundingBox[1], boundingBox[0])
	return control
}

function getChoice(boundingBox, texts, selectedIndex) {
	selectedIndex = getValueByDefault(0, selectedIndex)
	var control = {boundingBox:boundingBox, draw:drawChoice, mouseDown:mouseDownChoice, selectedIndex:selectedIndex, texts:texts}
	control.size = getSubtraction2D(boundingBox[1], boundingBox[0])
	control.choiceWidth = control.size[0] / texts.length
	return control
}

function getHorizontalSlider(boundingBox, lower, text, upper, value) {
	value = getValueByDefault(lower, value)
	var control = 	{boundingBox:boundingBox,
	draw:drawHorizontalSlider, horizontalText:text, mouseDown:mouseDownHorizontalSlider, lower:lower, upper:upper, value:value}
	var boundingBox = control.boundingBox
	control.width = boundingBox[1][1] - boundingBox[0][1]
	control.barRadius = 0.15 * control.width
	var columnSpace = 0.5 * control.width - control.barRadius
	control.midY = 0.5 * (control.boundingBox[0][1] + control.boundingBox[1][1])
	control.thumbDiameter = control.width - columnSpace
	control.thumbRadius = 0.5 * control.thumbDiameter
	control.rangeRight = boundingBox[1][0] - columnSpace
	control.barRight = boundingBox[0][0] + columnSpace
	control.thumbTop = control.rangeRight - control.thumbDiameter
	control.rangeOverValue = (control.thumbTop - control.barRight) / (control.upper - control.lower)
	return control
}

function getHorizontalSliderWide(boundingBox, lower, text, upper, value) {
	value = getValueByDefault(lower, value)
	var control = {boundingBox:boundingBox,
	draw:drawHorizontalSliderWide, horizontalText:text, mouseDown:mouseDownHorizontalSlider, lower:lower, upper:upper, value:value}
	var boundingBox = control.boundingBox
	control.titleEndX = 0.5 * (boundingBox[0][0] + boundingBox[1][0])
	control.variableBeginX = control.titleEndX + viewBroker.titleVariableGap
	control.width = viewBroker.controlWidth
	control.barRadius = 0.15 * control.width
	var columnSpace = 0.5 * control.width - control.barRadius
	control.midY = boundingBox[1][1] - 0.5 * control.width
	control.thumbDiameter = control.width - columnSpace
	control.thumbRadius = 0.5 * control.thumbDiameter
	control.rangeRight = boundingBox[1][0] - columnSpace
	control.barRight = boundingBox[0][0] + columnSpace
	control.thumbTop = control.rangeRight - control.thumbDiameter
	control.rangeOverValue = (control.thumbTop - control.barRight) / (control.upper - control.lower)
	return control
}

function getIntegerStep(step) {
	var powerTen = Math.pow(10.0, Math.floor(Math.log10(step)))
	step /= powerTen
	if (step < 2.0) {
		return powerTen
	}
	if (step < 5.0) {
		return 2.0 * powerTen
	}
	return 5.0 * powerTen
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

function getVerticalSlider(boundingBox, lower, text, upper, value) {
	value = getValueByDefault(lower, value)
	var control = {boundingBox:boundingBox,
	draw:drawVerticalSlider, mouseDown:mouseDownVerticalSlider, lower:lower, text:text, upper:upper, value:value}
	var boundingBox = control.boundingBox
	control.width = boundingBox[1][0] - boundingBox[0][0]
	control.barRadius = 0.15 * control.width
	var columnSpace = 0.5 * control.width - control.barRadius
	control.midX = 0.5 * (control.boundingBox[0][0] + control.boundingBox[1][0])
	control.thumbDiameter = control.width - columnSpace
	control.thumbRadius = 0.5 * control.thumbDiameter
	control.rangeBottom = boundingBox[1][1] - control.width
	control.barTop = boundingBox[0][1] + columnSpace
	control.thumbTop = control.rangeBottom - control.thumbDiameter
	control.rangeOverValue = (control.barTop - control.thumbTop) / (control.upper - control.lower)
	return control
}

function lineToPoint(context, point) {
	context.lineTo(point[0], point[1])
}

function moveToPoint(context, point) {
	context.moveTo(point[0], point[1])
}

function mouseDownCheckbox(control, event, viewer) {
	control.selectedState = !control.selectedState
	drawCheckbox(control, viewer)
	waitCallControlChanged(control, viewer)
}

function mouseDownChoice(control, event, viewer) {
	control.selectedIndex = Math.floor((event.offsetX - control.boundingBox[0][0]) / control.choiceWidth)
	control.selectedIndex = Math.max(control.selectedIndex, 0)
	control.selectedIndex = Math.min(control.selectedIndex, control.texts.length - 1)
	drawChoice(control, viewer)
	waitCallControlChanged(control, viewer)
}

function mouseDownControls(controls, event, viewer) {
	for (var control of controls) {
		if (control.mouseDown != undefined) {
			if (isPointInsideBoundingBox(control.boundingBox, viewBroker.mouseDown2D)) {
				control.mouseDown(control, event, viewer)
				return
			}
		}
	}
}

function mouseDownHorizontalSlider(control, event, viewer) {
	var thumbLeft = control.barRight + control.rangeOverValue * (control.value - control.lower)
	if (viewBroker.mouseDown2D[0] > thumbLeft && viewBroker.mouseDown2D[0] < thumbLeft + control.thumbDiameter) {
		control.mouseDownValue = control.value
		horizontalSliderManipulator.control = control
		horizontalSliderManipulator.viewer = viewer
		viewBroker.mouseMoveManipulator = horizontalSliderManipulator
	}
}

function mouseDownHorizontalSliderWide(control, event, viewer) {
	var thumbLeft = control.barRight + control.rangeOverValue * (control.value - control.lower)
	if (viewBroker.mouseDown2D[0] > thumbLeft && viewBroker.mouseDown2D[0] < thumbLeft + control.thumbDiameter) {
		control.mouseDownValue = control.value
		horizontalSliderWideManipulator.control = control
		horizontalSliderWideManipulator.viewer = viewer
		viewBroker.mouseMoveManipulator = horizontalSliderWideManipulator
	}
}

function mouseDownVerticalSlider(control, event, viewer) {
	var thumbUpper = control.thumbTop + control.rangeOverValue * (control.value - control.lower)
	if (viewBroker.mouseDown2D[1] > thumbUpper && viewBroker.mouseDown2D[1] < thumbUpper + control.thumbDiameter) {
		control.mouseDownValue = control.value
		verticalSliderManipulator.control = control
		verticalSliderManipulator.viewer = viewer
		viewBroker.mouseMoveManipulator = verticalSliderManipulator
	}
}

function mouseMoveControls(controls, event, viewer) {
	for (var control of controls) {
		if (control.mouseMove != undefined) {
			if (isPointInsideBoundingBox(control.boundingBox, viewBroker.mouseDown2D)) {
				control.mouseMove(control, event, viewer)
				return
			}
		}
	}
}

function roundRectPath(beginX, beginY, context, endX, endY, outset) {
	outset = getValueByDefault(8, outset)
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

function setTextContext(context) {
	context.font = viewBroker.textHeight.toString() + 'px freeserif,Palatino'
	context.fillStyle = 'black'
}

function setTypeSelect(selectedIndex, types) {
	var typeSelect = document.getElementById('typeSelectID')
	var options = typeSelect.options
	if (options.length > 0) {
		return
	}
	for (var type of types) {
		option = document.createElement('option')
		option.text = type
		typeSelect.add(option)
	}
	typeSelect.selectedIndex = selectedIndex
}

function setViewSelect(selectedIndex, views) {
	var viewSelect = document.getElementById('viewSelectID')
	var options = viewSelect.options
	for (var viewIndex = 0; viewIndex < views.length; viewIndex++) {
		var view = views[viewIndex]
		var option = null
		if (viewIndex >= options.length) {
			option = document.createElement('option')
			viewSelect.add(option)
		}
		else {
			option = options[viewIndex]
		}
		option.text = view.id
	}
	var optionLength = options.length
	for (var optionIndex = optionLength - 1; optionIndex >= views.length; optionIndex--) {
		options.remove(optionIndex)
	}
	viewSelect.selectedIndex = selectedIndex
}

function strokeRoundRect(beginX, beginY, context, endX, endY, outset) {
	roundRectPath(beginX, beginY, context, endX, endY, outset)
	context.stroke()
}

function toggleView() {
	toggleSessionBoolean('isViewHidden@')
	updateView()
}

function typeSelectChanged() {
	viewBroker.setType(document.getElementById('typeSelectID').selectedIndex)
	wordscapeViewerDraw()
}

function updateView() {
	var isViewHidden = !getSessionBoolean('isViewHidden@')
	var isDownloadHidden = isViewHidden
	if (viewBroker.view != null) {
		if (viewBroker.view.isDownloadHidden != undefined) {
			isDownloadHidden = viewBroker.view.isDownloadHidden
		}
	}
	document.getElementById('downloadCanvasButtonID').hidden = isDownloadHidden
	document.getElementById('typeSelectID').hidden = isViewHidden
	document.getElementById('viewSelectID').hidden = isViewHidden
}

function viewerMouseDown(event) {
	if (viewBroker.view != null) {
		viewBroker.mouseDown2D = [event.offsetX, event.offsetY]
		viewBroker.view.mouseDown(event)
	}
}

function viewerMouseMove(event) {
	if (viewBroker.view != null) {
		viewBroker.view.mouseMove(event)
	}
}

function viewerMouseOut(event) {
	if (viewBroker.view != null) {
		viewBroker.view.mouseOut(event)
	}
}

function viewerMouseUp(event) {
	if (viewBroker.view != null) {
		viewBroker.view.mouseUp(event)
	}
}

function viewSelectChanged() {
	var viewSelect = document.getElementById('viewSelectID')
	viewBroker.setView(viewSelect.selectedIndex)
	updateView()
	wordscapeViewerDraw()
}

function waitCallControlChanged(control, viewer) {
	if (control.controlChanged != undefined) {
		// wait in order for the canvas to draw the control before calling function
		setTimeout(function() {control.controlChanged(control, viewer)}, 5)
	}
}

function wordscapeViewerDraw() {
	if (viewBroker.view != null) {
		viewBroker.view.draw()
	}
}

var horizontalSliderManipulator = {
	mouseMove: function(event) {
		this.control.value = this.control.mouseDownValue + (event.offsetX - viewBroker.mouseDown2D[0]) / this.control.rangeOverValue
		boundDrawControlSlider(this.control, this.viewer)
	},
	mouseOut: function(event) {
		this.control.value = this.control.mouseDownValue
		drawControlSliderReset(this.control, this.viewer)
	},
	mouseUp: function(event) {
		drawControlSliderReset(this.control, this.viewer)
	}
}

var horizontalSliderWideManipulator = {
	mouseMove: function(event) {
		this.control.value = this.control.mouseDownValue + (event.offsetX - viewBroker.mouseDown2D[0]) / this.control.rangeOverValue
		boundDrawControlSlider(this.control, this.viewer)
	},
	mouseOut: function(event) {
		this.control.value = this.control.mouseDownValue
		drawControlSliderReset(this.control, this.viewer)
	},
	mouseUp: function(event) {
		drawControlSliderReset(this.control, this.viewer)
	}
}

var verticalSliderManipulator = {
	mouseMove: function(event) {
		this.control.value = this.control.mouseDownValue + (event.offsetY - viewBroker.mouseDown2D[1]) / this.control.rangeOverValue
		boundDrawControlSlider(this.control, this.viewer)
	},
	mouseOut: function(event) {
		this.control.value = this.control.mouseDownValue
		drawControlSliderReset(this.control, this.viewer)
	},
	mouseUp: function(event) {
		drawControlSliderReset(this.control, this.viewer)
	}
}

var viewBroker = {
	getOffsetNormal: function(event) {
		return normalize2D([event.offsetX - this.halfWidth, event.offsetY - this.halfHeight])
	},
	initialize: function() {
		this.canvasID = null
		this.controlWidth = 32
		this.minimumHeight = 256
		this.textHeight = 12
		this.textSpace = this.textHeight * 3 / 2
		this.textControlLift = this.controlWidth / 2 - 0.4 * this.textHeight
		this.doubleTextSpace = this.textSpace + this.textSpace
		this.titleVariableGap = 0.5 * this.textSpace
		this.typeSelectedIndex = 0
		this.viewID = null
		this.wideHeight = this.controlWidth + this.textSpace
	},
	setType: function(typeSelectedIndex) {
		this.typeSelectedIndex = typeSelectedIndex
		this.type = this.types[typeSelectedIndex]
	},
	setView: function(viewIndex) {
		this.view = this.registry.views[viewIndex]
		this.viewID = this.view.id
	},
	start: function(height, id, registry) {
		this.registry = registry
		var views = registry.views
		this.canvas = document.getElementById(id)
		this.canvas.height = height
		this.canvas.width = height + 17.0 * this.textHeight
		this.mouseDown2D = null
		this.mouseMoveManipulator = null
		this.types = ['Solid Polyhedral', 'Solid Triangular', 'Wireframe Polyhedral', 'Wireframe Triangular']
		this.type = this.types[this.typeSelectedIndex]
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
		var selectedIndex = views.length
		setTypeSelect(this.typeSelectedIndex, this.types)
		views.sort(compareIDAscending)
		for (; selectedIndex > 0;) {
			selectedIndex--
			if (views[selectedIndex].id == this.viewID) {
				this.view = views[selectedIndex]
				break
			}
			
		}
		setViewSelect(selectedIndex, views)
		this.setView(selectedIndex)
		this.setType(this.typeSelectedIndex)
		this.heightMinus = height - this.controlWidth
		this.analysisBottom = 5 * this.textSpace
		this.analysisBoundingBox = [[height, 0], [this.canvas.width, this.analysisBottom]]
		this.analysisCharacterBegin = this.analysisBoundingBox[0][0] + 0.5 * this.textHeight
		this.analysisSizeBegin = this.analysisBoundingBox[0][0] + 2 * this.textHeight
		this.analysisLowerBegin = this.analysisBoundingBox[0][0] + 7 * this.textHeight
		this.analysisUpperBegin = this.analysisBoundingBox[0][0] + 12 * this.textHeight
		for (var view of views) {
			view.start()
		}
		updateView()
		wordscapeViewerDraw()
		if (id != this.canvasID) {
			this.canvasID = id
			this.canvas.addEventListener('mousedown', viewerMouseDown)
			this.canvas.addEventListener('mousemove', viewerMouseMove)
			this.canvas.addEventListener('mouseout', viewerMouseOut)
			this.canvas.addEventListener('mouseup', viewerMouseUp)
		}
	}
}

viewBroker.initialize()
