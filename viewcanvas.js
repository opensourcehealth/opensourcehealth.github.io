//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

class CanvasControl {
	static defaultHeightNew() {
		return viewCanvas.controlWidth
	}
	draw(context) {
		if (this.getDisplay() != false) {
			if (this.clipBox != undefined) {
				var clipBox = this.clipBox
				context.save()
				var region = new Path2D()
				var size = VectorFast.getSubtraction2D(clipBox[1], clipBox[0])
				region.rect(clipBox[0][0], clipBox[0][1], size[0], size[1])
				context.clip(region)
			}
			this.drawPrivate(context)
			if (this.clipBox != undefined) {
				context.restore()
			}
		}
	}
	getDisplay() {
		if (this.displayFunction == undefined) {
			return this.display
		}

		return this.displayFunction(this)
	}
	getValue() {
		if (this.value == undefined) {
			return this.valueMap.get(this.key)
		}

		return this.value
	}
	mouseDown(context, event) {
		if (this.mouseDownPrivate == undefined) {
			return
		}

		if (!isPointInsideBoundingBox(this.boundingBox, viewCanvas.mouseDown2D) || this.getDisplay() == false) {
			return
		}

		if (this.clipBox != undefined) {
			if (!isPointInsideBoundingBox(this.clipBox, viewCanvas.mouseDown2D)) {
				return
			}
		}

		this.mouseDownPrivate(context, event)
	}
	resize(boundingBox) {
		this.boundingBox = boundingBox
	}
	setValue(value) {
		if (this.value == undefined) {
			this.valueMap.set(this.key, value)
			return
		}

		this.value = value
	}
}

function boundDrawControlSlider(context, control) {
	control.value = Value.getBounded(control.value, control.lower, control.upper)
	if (event.shiftKey) {
		var along = Value.getStep((control.value - control.lower) / (control.upper - control.lower), 1.0 / 30.0)
		control.value = (1.0 - along) * control.lower + along * control.upper
	}

	drawControlSlider(context, control)
}

class Button extends CanvasControl {
	constructor(boundingBox, text) {
		super()
		this.boundingBox = boundingBox
		this.text = text
	}
	drawPrivate(context) {
		drawControlText(this.boundingBox, context, this.text)
	}
	mouseDownPrivate(context, event) {
		if (this.onClick != undefined) {
			this.onClick(context, this, event)
		}
	}
}

class Checkbox extends CanvasControl {
	constructor(boundingBox, text, value) {
		super()
		this.boundingBox = boundingBox
		this.text = text
		if (Array.isArray(value)) {
			this.key = value[0]
			this.valueMap = value[1]
			return
		}

		this.value = Value.getValueDefault(value, true)
	}
	drawPrivate(context) {
		var boundingBox = this.boundingBox
		drawControlText(boundingBox, context, this.text)
		clearFillBoundingBox(boundingBox, context)
		var outset = 10
		var left = boundingBox[0][0] + 0.6 * outset
		var width = boundingBox[1][1] - boundingBox[0][1] - 2 * outset
		var checkboxTop = boundingBox[0][1] + outset
		setTextContext(context, 'center')
		context.fillText(this.text, 0.5 * (left + width + boundingBox[1][0]), boundingBox[1][1] - viewCanvas.textControlLift)
		context.lineWidth = 1.0
		if (this.getValue()) {
			context.beginPath()
			moveToContextPoint(context, [left, checkboxTop + 0.7 * width])
			lineToContextPoint(context, [left + 0.05 * width, checkboxTop + 0.65 * width])
			lineToContextPoint(context, [left + 0.45 * width, checkboxTop + 0.85 * width])
			lineToContextPoint(context, [left + 0.95 * width, checkboxTop - 0.2 * width])
			lineToContextPoint(context, [left + width, checkboxTop - 0.15 * width])
			lineToContextPoint(context, [left + 0.5 * width, checkboxTop + 1.2 * width])
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
	mouseDownPrivate(context, event) {
		this.toggleSelectedState()
		this.drawPrivate(context)
		waitCallControlChanged(context, this)
	}
	toggleSelectedState() {
		this.setValue(!this.getValue())
	}
}

class Choice extends CanvasControl {
	constructor(boundingBox, texts, value) {
		super()
		this.boundingBox = boundingBox
		this.choiceWidth = (boundingBox[1][0] - boundingBox[0][0]) / texts.length
		this.texts = texts
		if (Array.isArray(value)) {
			this.key = value[0]
			this.valueMap = value[1]
			return
		}

		this.value = Value.getValueDefault(value, 0)
	}
	drawPrivate(context) {
		clearFillBoundingBox(this.boundingBox, context)
		var left = this.boundingBox[0][0] + this.getValue() * this.choiceWidth
		drawChoiceButtonByWidth(this.boundingBox, context, '#ffff99', left, this.choiceWidth) // Canary
		drawChoiceTexts(this.boundingBox, context, this.texts, this.choiceWidth)
	}
	getSelectedName(control) {
		return this.texts[this.getValue()]
	}
	mouseDownPrivate(context, event) {
		this.setValue(getSelectedIndexByWidth(event, this.boundingBox[0][0], this.texts, this.choiceWidth))
		this.drawPrivate(context)
		waitCallControlChanged(context, this)
	}
}

function clearBoundingBox(boundingBox, context) {
	var size = VectorFast.getSubtraction2D(boundingBox[1], boundingBox[0])
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

function drawChoiceButtonByWidth(boundingBox, context, fillStyle, left, width) {
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

function drawControlSlider(context, control) {
	if (control.drawParent != undefined) {
		control = control.drawParent
	}

	control.draw(context)
	if (control.controlChanged != undefined) {
		control.controlChanged(context, control)
	}
}

function drawControlSliderReset(context, control) {
	drawControlSlider(context, control)
	viewCanvas.mouseDownCenterOffset = undefined
	viewCanvas.mouseDown2D = undefined
	viewCanvas.mouseMoveManipulator = undefined
}

function drawChoiceTexts(boundingBox, context, texts, width) {
	setTextContext(context, 'center')
	var textOffsetX = boundingBox[0][0] + width * 0.5
	for (var textIndex = 0; textIndex < texts.length; textIndex++) {
		var text = texts[textIndex]
		context.fillText(text, width * textIndex + textOffsetX, boundingBox[1][1] - viewCanvas.textControlLift)
	}
}

function drawControlText(boundingBox, context, text) {
	clearFillBoundingBox(boundingBox, context)
	setTextContext(context, 'center')
	context.fillText(text, 0.5 * (boundingBox[0][0] + boundingBox[1][0]), boundingBox[1][1] - viewCanvas.textControlLift)
}

function drawHorizontalBarThumb(barRadius, context, left, thumbRadius, right, thumbLeft, y) {
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
	context.arc(x, y, thumbRadius, 0.0, gPI2)
	context.closePath()
	context.fillStyle = 'green'
	context.fill()
}

function drawTextBeforeAfter(context, textBefore, textAfter, x, y) {
	setTextContext(context, 'right')
	context.fillText(textBefore, x, y)
	context.textAlign = 'left'
	context.fillText(textAfter, x + viewCanvas.halfTextSpace, y)
}

function drawVerticalBar(bottom, context, radius, top, x, y) {
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

function getSelectedIndexByWidth(event, left, texts, width) {
	return Value.getBounded(Math.floor((event.offsetX - left) / width), 0, texts.length - 1)
}

function getTitleEndX(lower, upper) {
	return lower * 0.4 + upper * 0.6
}

class HorizontalSlider extends CanvasControl {
	constructor(boundingBox, lower, text, upper, value) {
		super()
		this.width = boundingBox[1][1] - boundingBox[0][1]
		setHorizontalSlider(this, lower, text, upper, value)
		this.resize(boundingBox)
	}
	drawPrivate(context) {
		var boundingBox = this.boundingBox
		var thumbLeft = this.rangeLeft + this.rangeOverValue * (this.value - this.lower)
		clearFillBoundingBox(boundingBox, context)
		setTextContext(context)
		context.fillText(this.text, boundingBox[0][0] + viewCanvas.halfTextSpace, boundingBox[1][1] - viewCanvas.textControlLift)
		drawHorizontalBarThumb(this.barRadius, context, this.rangeLeft, this.thumbRadius, this.rangeRight, thumbLeft, this.midY)
	}
	mouseDownPrivate(context, event) {
		mouseDownHorizontalSlider(context, this)
	}
	resize(boundingBox) {
		resizeHorizontalSlider(boundingBox, this)
		this.midY = 0.5 * (boundingBox[0][1] + boundingBox[1][1])
	}
}

var horizontalSliderManipulator = {
	mouseMove: function(context, event) {
		this.control.value = this.control.mouseValueOffset + event.offsetX / this.control.rangeOverValue
		boundDrawControlSlider(context, this.control, event)
	},
	mouseOut: function(context, event) {
		this.control.value = this.control.mouseDownValue
		drawControlSliderReset(context, this.control)
	},
	mouseUp: function(context, event) {
		drawControlSliderReset(context, this.control)
	}
}

class HorizontalSliderPoint extends CanvasControl {
	constructor(boundingBox, lower, text, upper, point) {
		super()
		this.width = viewCanvas.controlWidth
		point = Value.getValueDefault(point, [lower, lower])
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
		return viewCanvas.wideHeight + viewCanvas.controlWidth
	}
	resize(boundingBox) {
		this.boundingBox = boundingBox
		var top = boundingBox[0][1] + viewCanvas.textSpace
		var sliderHeight = 1.0 * (boundingBox[1][1] - top) / this.sliders.length
		for (var slider of this.sliders) {
			var nextTop = top + sliderHeight
			resizeHorizontalSlider([[boundingBox[0][0], top], [boundingBox[1][0], nextTop]], slider)
			slider.midY = (top + nextTop) * 0.5
			top = nextTop
		}

		this.titleEndX = getTitleEndX(boundingBox[0][0], boundingBox[1][0])
		this.textY = boundingBox[0][1] + viewCanvas.textSpace
	}
	drawPrivate(context) {
		var boundingBox = this.boundingBox
		clearFillBoundingBox(boundingBox, context)
		var valueStrings = []
		for (var slider of this.sliders) {
			var rangeLeft = slider.rangeLeft
			var thumbLeft = rangeLeft + slider.rangeOverValue * (slider.value - slider.lower)
			drawHorizontalBarThumb(slider.barRadius, context, rangeLeft, slider.thumbRadius, slider.rangeRight, thumbLeft, slider.midY)
			valueStrings.push(getControlValue(this, slider.value).toFixed(Value.getValueDefault(this.decimalPlaces, 0)))
		}

		drawTextBeforeAfter(context, this.text, valueStrings.join(', '), this.titleEndX, this.textY)

	}
	mouseDownPrivate(context, event) {
		for (var slider of this.sliders) {
			var sliderBox = slider.boundingBox
			var mouseY = viewCanvas.mouseDown2D[1]
			if (mouseY < sliderBox[1][1] && mouseY > sliderBox[0][1]) {
				mouseDownHorizontalSlider(context, slider)
			}
		}
	}
}

class HorizontalSliderWide extends CanvasControl {
	constructor(boundingBox, lower, text, upper, value) {
		super()
		this.width = viewCanvas.controlWidth
		setHorizontalSlider(this, lower, text, upper, value)
		this.resize(boundingBox)
	}
	static defaultHeightNew() {
		return viewCanvas.wideHeight
	}
	resize(boundingBox) {
		resizeHorizontalSlider(boundingBox, this)
		this.midY = boundingBox[1][1] - 0.5 * this.width
		this.titleEndX = getTitleEndX(boundingBox[0][0], boundingBox[1][0])
		this.textY = boundingBox[0][1] + viewCanvas.textSpace
	}
	drawPrivate(context) {
		var boundingBox = this.boundingBox
		var thumbLeft = this.rangeLeft + this.rangeOverValue * (this.value - this.lower)
		clearFillBoundingBox(boundingBox, context)
		drawHorizontalBarThumb(this.barRadius, context, this.rangeLeft, this.thumbRadius, this.rangeRight, thumbLeft, this.midY)
		var textAfter = getControlValue(this, this.value).toFixed(Value.getValueDefault(this.decimalPlaces, 0))
		drawTextBeforeAfter(context, this.text, textAfter, this.titleEndX, this.textY)
	}
	mouseDownPrivate(context, event) {
		mouseDownHorizontalSlider(context, this)
	}
}

function lineToContextPoint(context, point) {
	context.lineTo(point[0], point[1])
}

function mouseDownHorizontalSlider(context, control) {
	var thumbLeft = control.rangeLeft + control.rangeOverValue * (control.value - control.lower)
	var mouseDownX = viewCanvas.mouseDown2D[0]
	control.mouseDownValue = control.value
	control.mouseValueOffset = control.value - mouseDownX / control.rangeOverValue
	horizontalSliderManipulator.control = control
	viewCanvas.mouseMoveManipulator = horizontalSliderManipulator
	if (mouseDownX < thumbLeft || mouseDownX > thumbLeft + control.thumbDiameter) {
		var thumbX = thumbLeft + control.thumbRadius
		control.mouseValueOffset += (mouseDownX - thumbX) / control.rangeOverValue
		horizontalSliderManipulator.mouseMove(context, event)
	}

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
	if (control.oldLower * control.oldUpper < 0.0) {
		control.lower = (control.oldLower + control.oldUpper - integerSpan) * 0.5
	}
	else {
		control.lower = control.oldLower
	}

	control.lower = Value.getStep(control.lower, integerStep)
	control.upper = control.lower + integerSpan
	upperMinusLower = control.upper - control.lower
	control.rangeOverValue = rangeLength / upperMinusLower
}

function roundRectPath(beginX, beginY, context, endX, endY, outset) {
	outset = Value.getValueDefault(outset, 8)
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
	control.value = Value.getValueDefault(value, lower)
	control.oldLower = Math.min(lower, control.value)
	control.oldUpper = Math.max(upper, control.value)
	control.text = text
}

function setTextContext(context, textAlign) {
	context.font = viewCanvas.textHeight.toString() + 'px freeserif,Palatino'
	context.fillStyle = 'black'
	context.textAlign = Value.getValueDefault(textAlign, 'left')
}

function strokeRoundRect(beginX, beginY, context, endX, endY, outset) {
	roundRectPath(beginX, beginY, context, endX, endY, outset)
	context.stroke()
}

function waitCallControlChanged(context, control) {
	if (control.controlChanged != undefined) {
		// wait in order for the canvas to draw the control before calling function
		setTimeout(function() {control.controlChanged(context, control)}, 5)
	}
}

function moveToContextPoint(context, point) {
	context.moveTo(point[0], point[1])
}

class TableChoice extends Choice {
	constructor(boundingBox, texts, numberOfRows, value) {
		super(boundingBox, texts, value)
		this.numberOfRows = Value.getValueDefault(numberOfRows, 2)
		this.boundingBoxes = new Array(numberOfRows)
		this.choiceWidths = new Array(numberOfRows)
		this.rowTextArrays = new Array(numberOfRows)
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
	}
	drawPrivate(context) {
		clearFillBoundingBox(this.boundingBox, context)
		var rowSelectedIndex = this.getValue()
		for (var rowIndex = 0; rowIndex < this.numberOfRows; rowIndex++) {
			var choiceWidth = this.choiceWidths[rowIndex]
			var rowBoundingBox = this.boundingBoxes[rowIndex]
			var rowTexts = this.rowTextArrays[rowIndex]
			if (rowSelectedIndex >= 0 && rowSelectedIndex < rowTexts.length) {
				var left = rowBoundingBox[0][0] + rowSelectedIndex * choiceWidth
				drawChoiceButtonByWidth(rowBoundingBox, context, '#f0ffff', left, choiceWidth)
			}
			drawChoiceTexts(rowBoundingBox, context, rowTexts, choiceWidth)
			rowSelectedIndex -= rowTexts.length
		}
	}
	mouseDownPrivate(context, event) {
		var left = this.boundingBox[0][0]
		var rowSelected = Value.getBounded(Math.floor((event.offsetY - this.boundingBox[0][1]) / this.rowHeight), 0, this.numberOfRows)
		this.setValue(getSelectedIndexByWidth(event, left, this.rowTextArrays[rowSelected], this.choiceWidths[rowSelected]))
		for (var rowIndex = 0; rowIndex < rowSelected; rowIndex++) {
			this.setValue(this.getValue() + this.rowTextArrays[rowIndex].length)
		}

		this.drawPrivate(context)
		waitCallControlChanged(context, this)
	}
}

class VerticalScrollBar extends CanvasControl {
	constructor(boundingBox, lower, span, upper, value) {
		super()
		value = Value.getValueDefault(value, lower)
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
	drawPrivate(context) {
		var thumbY = this.rangeBottom - this.thumbRadius + this.rangeOverValue * (this.value - this.lower)
		clearFillBoundingBox(this.boundingBox, context)
		drawVerticalBar(this.rangeBottom, context, this.barRadius, this.barTop, this.midX, thumbY)
		context.beginPath()
		context.arc(this.midX, thumbY + this.thumbNegativeHeight, this.thumbRadius, -Math.PI, 0.0)
		context.arc(this.midX, thumbY, this.thumbRadius, 0.0, Math.PI)
		context.closePath()
		context.fillStyle = 'green'
		context.fill()
	}
	mouseDownPrivate(context, event) {
		var thumbLower = this.rangeBottom + this.rangeOverValue * (this.value - this.lower)
		var mouseDownY = viewCanvas.mouseDown2D[1]
		this.mouseDownValue = this.value
		this.mouseValueOffset = this.value - mouseDownY / this.rangeOverValue
		verticalSliderManipulator.control = this
		viewCanvas.mouseMoveManipulator = verticalSliderManipulator
		var thumbY = thumbLower - this.thumbRadius
		if (mouseDownY > thumbLower) {
			this.mouseValueOffset += (mouseDownY - thumbY) / this.rangeOverValue
			verticalSliderManipulator.mouseMove(context, event)
			return
		}

		if (mouseDownY < thumbLower + this.thumbNegativeOuter) {
			var thumbTopY = thumbY + this.thumbNegativeOuter + this.thumbDiameter
			this.mouseValueOffset += (mouseDownY - thumbTopY) / this.rangeOverValue
			verticalSliderManipulator.mouseMove(context, event)
			return
		}
	}

}

class VerticalSlider extends CanvasControl {
	constructor(boundingBox, lower, text, upper, value) {
		super()
		value = Value.getValueDefault(value, lower)
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
	drawPrivate(context) {
		var thumbY = this.rangeBottom - this.thumbRadius + this.rangeOverValue * (this.value - this.lower)
		drawControlText(this.boundingBox, context, this.text)
		drawVerticalBar(this.rangeBottom, context, this.barRadius, this.barTop, this.midX, thumbY)
		context.beginPath()
		context.arc(this.midX, thumbY, this.thumbRadius, 0.0, gPI2)
		context.closePath()
		context.fillStyle = 'green'
		context.fill()
	}
	mouseDownPrivate(context, event) {
		var thumbLower = this.rangeBottom + this.rangeOverValue * (this.value - this.lower)
		var mouseDownY = viewCanvas.mouseDown2D[1]
		this.mouseDownValue = this.value
		this.mouseValueOffset = this.value - mouseDownY / this.rangeOverValue
		verticalSliderManipulator.control = this
		viewCanvas.mouseMoveManipulator = verticalSliderManipulator
		if (mouseDownY < thumbLower - this.thumbDiameter || mouseDownY > thumbLower) {
			var thumbY = thumbLower - this.thumbRadius
			this.mouseValueOffset += (mouseDownY - thumbY) / this.rangeOverValue
			verticalSliderManipulator.mouseMove(context, event)
		}
	}
}

var verticalSliderManipulator = {
	mouseMove: function(context, event) {
		this.control.value = this.control.mouseValueOffset + event.offsetY / this.control.rangeOverValue
		boundDrawControlSlider(context, this.control, event)
	},
	mouseOut: function(context, event) {
		this.control.value = this.control.mouseDownValue
		drawControlSliderReset(context, this.control)
	},
	mouseUp: function(context, event) {
		drawControlSliderReset(context, this.control)
	}
}

var viewCanvas = {
	initializeControlText: function(controlWidth, textHeight) {
		this.controlWidth = controlWidth
		this.textHeight = textHeight
		this.textDown = this.textHeight * 1.4
		this.textSpace = this.textHeight * 1.5
		this.halfTextSpace = this.textSpace * 0.5
		this.textControlLift = this.controlWidth * 0.5 - 0.4 * this.textHeight
		this.valueMap = new Map()
		this.wideHeight = this.controlWidth + this.textSpace
	},
}

viewCanvas.initializeControlText(32, 12)
