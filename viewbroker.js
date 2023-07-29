//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gGridSpacingMultiplier = 0.2

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
	setTextContext(context, 'center')
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
	var parent = control.parent
	var left = boundingBox[0][0] + parent.selectedIndex * control.choiceWidth
	clearFillBoundingBox(boundingBox, context)
	if (parent.control == control) {
		context.fillStyle = '#ffff99' // canary
		fillRoundRect(left + 2, boundingBox[0][1] + 2, context, left + control.choiceWidth - 2, boundingBox[1][1] - 2)
		context.lineWidth = 1.0
		context.strokeStyle = 'green'
		strokeRoundRect(left + 2, boundingBox[0][1] + 2, context, left + control.choiceWidth - 2, boundingBox[1][1] - 2)
	}
	setTextContext(context, 'center')
	var textOffsetX = boundingBox[0][0] + control.choiceWidth * 0.5
	for (var textIndex = 0; textIndex < control.texts.length; textIndex++) {
		var text = control.texts[textIndex]
		context.fillText(text, control.choiceWidth * textIndex + textOffsetX, boundingBox[1][1] - viewBroker.textControlLift)
	}
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
	viewBroker.mouseDown2D = undefined
	viewBroker.mouseMoveManipulator = undefined
}

function drawControlText(boundingBox, text) {
	var context = viewBroker.context
	clearFillBoundingBox(boundingBox, context)
	setTextContext(context, 'center')
	context.fillText(text, 0.5 * (boundingBox[0][0] + boundingBox[1][0]), boundingBox[1][1] - viewBroker.textControlLift)
}

function drawGridSpacing(context, gridSpacing, selectedState) {
	var height = viewBroker.canvas.height
	var gridSpacingBox = [[height, height - viewBroker.doubleTextSpace], [viewBroker.canvas.width, height]]
	clearBoundingBox(gridSpacingBox, context)
	if (selectedState) {
		setTextContext(context)
		var x = viewBroker.analysisCharacterBegin
		var y = height - viewBroker.textControlLift
		var text = 'Grid Spacing:'
		context.fillText(text, x, y)
		drawNumericArray(context, getIntegerStep(gridSpacing), x + getTextLength(text + ' ') * viewBroker.textHeight, y)
	}
}

function drawHorizontalSlider(control, viewer) {
	var boundingBox = control.boundingBox
	var context = viewBroker.context
	var thumbLeft = control.barRight + control.rangeOverValue * (control.value - control.lower)
	var thumbX = thumbLeft + control.thumbRadius
	clearFillBoundingBox(boundingBox, context)
	setTextContext(context)
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
	setTextContext(context, 'right')
	var textY = 0.5 * (boundingBox[0][1] + boundingBox[1][1]) + viewBroker.textHeight - viewBroker.textSpace
	context.fillText(control.horizontalText, control.titleEndX, textY)

	var decimalPlaces = getValueDefault(control.decimalPlaces, 0)
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

function drawLine(context, begin, end) {
	context.beginPath()
	moveToPoint(context, begin)
	lineToPoint(context, end)
	context.stroke()
	context.closePath()
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
	selectedState = getValueTrue(selectedState)
	var control = {boundingBox:boundingBox, draw:drawCheckbox, mouseDown:mouseDownCheckbox, selectedState:selectedState, text:text}
	control.size = getSubtraction2D(boundingBox[1], boundingBox[0])
	return control
}

function getChoice(boundingBox, texts, parent) {
	var control = {boundingBox:boundingBox, draw:drawChoice, mouseDown:mouseDownChoice, parent:parent, texts:texts}
	control.size = getSubtraction2D(boundingBox[1], boundingBox[0])
	control.choiceWidth = control.size[0] / texts.length
	return control
}

function getExponentialZoom() {
	return Math.pow(10.0, viewBroker.view.zoomControl.value)
}

function getHeightMinusOverZoom() {
	return 1.8 * viewBroker.halfHeightMinus / getExponentialZoom()
}

function getHorizontalSlider(boundingBox, lower, text, upper, value) {
	value = getValueDefault(value, lower)
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
	value = getValueDefault(value, lower)
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

function getSelectedName(parent) {
	return parent.control.texts[parent.selectedIndex]
}

function getVerticalSlider(boundingBox, lower, text, upper, value) {
	value = getValueDefault(value, lower)
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
	var parent = control.parent
	parent.control = control
	parent.selectedIndex = Math.floor((event.offsetX - control.boundingBox[0][0]) / control.choiceWidth)
	parent.selectedIndex = Math.max(parent.selectedIndex, 0)
	parent.selectedIndex = Math.min(parent.selectedIndex, control.texts.length - 1)
	drawControls(parent.controls, viewer)
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

function toggleView() {
	toggleSessionBoolean('isViewHidden@')
	updateView()
}

function updateView() {
	var isViewHidden = !getSessionBoolean('isViewHidden@')
	if (viewBroker.view != null) {
		if (viewBroker.view.updateViewer != undefined) {
			viewBroker.view.updateViewer(isViewHidden)
		}
	}

	document.getElementById('viewSelectID').hidden = isViewHidden
	setOthersMenuLine(isViewHidden, document.getElementById('viewMenuSelectID'))
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

function viewMenuSelectChanged() {
	var viewMenuSelect = document.getElementById('viewMenuSelectID')
	var viewMenuText = viewMenuSelect.options[viewMenuSelect.selectedIndex].text
	if (viewMenuText.endsWith(' Others')) {
		toggleSessionBoolean('isViewHidden@')
	}
	else {
		if (viewMenuText == 'Download Canvas') {
			downloadCanvas()
		}
	}

	viewMenuSelect.selectedIndex = 0
	updateView()
}

function viewSelectChanged() {
	var viewSelect = document.getElementById('viewSelectID')
	viewBroker.setView(viewSelect.selectedIndex)
	updateView()
	clearBoundingBox(viewBroker.boundingBox, viewBroker.context)
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
		this.viewID = null
		this.wideHeight = this.controlWidth + this.textSpace
	},
	setView: function(viewIndex) {
		if (this.view != null) {
			if (this.view.clearViewer != undefined) {
				this.view.clearViewer()
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
		this.canvas.width = height + 17.0 * this.textHeight
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
		setSelectToKeysIndexTitle(document.getElementById('viewMenuSelectID'), ['', 'Download Canvas'], 0, 'View')
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
