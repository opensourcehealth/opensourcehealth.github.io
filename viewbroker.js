//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gGridSpacingMultiplier = 0.1

function controlIsAnalysisName(control) {
	return control.display != false && control.view.analysis.analysisControl.getSelectedName() == control.name
}

function drawAnalysisControls(context, control) {
	drawControls(context, control.view.analysis.analysisControls)
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

function drawByGeneratorName(context, controls, generatorName) {
	for (var control of controls) {
		if (control.generatorName == generatorName) {
			control.draw(context)
		}
	}
}

function drawControls(context, controls) {
	for (var control of controls) {
		control.draw(context)
	}
}

function drawLine(context, begin, end) {
	context.beginPath()
	moveToContextPoint(context, begin)
	lineToContextPoint(context, end)
	context.stroke()
}

function drawLines(context, points, pointLength) {
	pointLength = Value.getValueDefault(pointLength, points.length)
	for (var vertexIndex = 0; vertexIndex < pointLength; vertexIndex++) {
		drawLine(context, points[vertexIndex], points[(vertexIndex + 1) % points.length])
	}
}

function drawNumericArray(context, element, x, y, decimalPlaces) {
	decimalPlaces = Value.getValueDefault(decimalPlaces, 0)
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

	boundingBox[1] = VectorFast.getAddition2D(boundingBox[0], upperPoint)
	boundingBox[0] = VectorFast.getAddition2D(boundingBox[0], lowerPoint)
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
	if (view != undefined) {
		view.draw(viewBroker.context)
	}

	var size = VectorFast.getSubtraction2D(boundingBox[1], boundingBox[0])
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
	if (viewCanvas.mouseDown2D == undefined) {
		return undefined
	}

	var mouseMovement = [event.offsetX - viewCanvas.mouseDown2D[0], event.offsetY - viewCanvas.mouseDown2D[1]]
	if (mouseMovement[0] == 0.0 && mouseMovement[1] == 0.0) {
		return undefined
	}

	if (event.ctrlKey) {
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

function getSVGContext() {
	wordscapeViewDraw()
	var oldContext = viewBroker.context
	svgContext.initialize()
	viewBroker.context = svgContext
	var view = viewBroker.view
	view.viewControl.draw(viewBroker.context)
	viewBroker.context = oldContext
	return svgContext
}

function mouseDownControls(context, controls, event) {
	for (var control of controls) {
		control.mouseDown(context, event)
	}
}

function outputCanvasAsSVG() {
	if (viewBroker.view == undefined) {
		return
	}

	addOutputArea(getSVGContext().getText(), 'View SVG - ' + viewBroker.view.id)
}

function outputCenteredCanvasAsSVG() {
	if (viewBroker.view == undefined) {
		return
	}

	addOutputArea(getSVGContext().getCenteredText(), 'View Centered SVG - ' + viewBroker.view.id)
}

function removeByGeneratorName(elements, generatorName) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (elements[elementIndex].generatorName == generatorName) {
			elements[elementIndex] = undefined
		}
	}

	Vector.removeUndefineds(elements)
}

function removeStatementsByGeneratorName(generatorName, registry, statements) {
	for (var statementIndex = 0; statementIndex < statements.length; statementIndex++) {
		var statement = statements[statementIndex]
		if (statement.generatorName == generatorName) {
			statements[statementIndex] = undefined
			registry.idMap.delete(statement.attributeMap.get('id'))
		}
	}

	Vector.removeUndefineds(statements)
}

function setDisplayFunctionControls(controls, displayFunction) {
	for (var control of controls) {
		control.displayFunction = displayFunction
	}
}

function setViewControls(controls, view) {
	for (var control of controls) {
		control.view = view
	}
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
		var center = VectorFast.multiply2DScalar(VectorFast.getAddition2D(boundingBox[0], boundingBox[1]), 0.5)
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
		var size = VectorFast.getSubtraction2D(boundingBox[1], boundingBox[0])
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

function toggleView() {
	toggleSessionBoolean('isViewHidden@')
	updateView()
}

function updateView() {
	var isViewHidden = !getSessionBoolean('isViewHidden@')
	if (viewBroker.view != undefined) {
		var analysis = viewBroker.view.analysis
		if (analysis != undefined) {
			if (analysis.updateView != undefined) {
				analysis.updateView(isViewHidden)
			}
		}
	}

	document.getElementById('viewSelectID').hidden = isViewHidden
	setOthersMenuLine(isViewHidden, document.getElementById('viewMenuSelectID'))
}

var viewBroker = {
	center:{text:'Center', point:[0.0, 0.0]},
	direction:{text:'Direction', lower:-180.0, upper:180.0, value:90.0},
	getOffsetNormal: function(event) {
		return Vector.normalize2D([event.offsetX - this.halfWidth, this.halfHeight - event.offsetY])
	},
	minimumHeight:256,
	numberOfBigSides:{text:'Sides', lower:3, upper:60, value:36},
	numberOfInteriorSides:{text:'Sides', lower:3, upper:20, value:8},
	numberOfSides:{text:'Sides', lower:3, upper:60, value:gFillet.sides},
	segment:{text:'Segment', checked:false},
	setView: function(viewIndex) {
		if (this.view != undefined) {
			var analysis = this.view.analysis
			if (analysis != undefined) {
				if (analysis.clearView != undefined) {
					analysis.clearView()
				}
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
		this.canvas.width = height + 20.0 * viewCanvas.textHeight
		if (views.length == 0) {
			return
		}

		this.context = this.canvas.getContext('2d')
		this.context.lineJoin = 'round'
		this.halfHeight = height / 2
		this.halfHeightMinus = this.halfHeight - viewCanvas.controlWidth
		this.halfWidth = height / 2
		this.canvasCenter = [this.halfWidth, this.halfHeight]
		this.modelDiameter = height - 2.0 * viewCanvas.controlWidth
		this.canvasCenterMatrix = getMatrix3DByTranslate(this.canvasCenter)
		this.rotationMultiplier = 720.0 / (2.0 + Math.PI) / this.modelDiameter
		var viewKeys = ['', 'Export Canvas As PNG', 'Export Clipped Canvas As PNG', 'Output Canvas As SVG', 'Output Centered Canvas As SVG']
		setSelectToKeysIndexTitle(document.getElementById('viewMenuSelectID'), viewKeys, 0, 'View')
		views.sort(Vector.compareIDAscending)
		var ids = new Array(views.length)
		for (var viewIndex = 0; viewIndex < views.length; viewIndex++) {
			ids[viewIndex] = views[viewIndex].id
		}

		var viewSelectedIndex = Math.max(ids.indexOf(this.viewID), 0)
		setSelectToKeysIndexTitle(document.getElementById('viewSelectID'), ids, viewSelectedIndex)
		this.setView(viewSelectedIndex)
		this.heightMinus = height - viewCanvas.controlWidth
		this.analysisCharacterBegin = height + 0.5 * viewCanvas.textHeight
		this.analysisLowerBegin = height + 2 * viewCanvas.textHeight
		this.analysisUpperBegin = height + 7 * viewCanvas.textHeight
		this.analysisSizeBegin = height + 12 * viewCanvas.textHeight
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
	if (viewBroker.view != undefined) {
		viewCanvas.mouseDown2D = [event.offsetX, event.offsetY]
		viewBroker.view.mouseDown(viewBroker.context, event)
	}
}

function viewMouseMove(event) {
	if (viewBroker.view != undefined) {
		viewBroker.view.mouseMove(viewBroker.context, event)
	}
}

function viewMouseOut(event) {
	if (viewBroker.view != undefined) {
		viewBroker.view.mouseOut(viewBroker.context, event)
	}
}

function viewMouseUp(event) {
	if (viewBroker.view != undefined) {
		viewBroker.view.mouseUp(viewBroker.context, event)
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

function wordscapeViewDraw() {
	if (viewBroker.view != undefined) {
		viewBroker.view.draw(viewBroker.context)
	}
}
