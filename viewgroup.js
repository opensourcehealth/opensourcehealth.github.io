//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gSecondaryLineWidthMultiplier = 0.7

function drawGroupWithoutArguments() {
	viewBroker.view.viewControl.draw(viewBroker.context)
}

function drawGroupGrid(context, control) {
}

function drawGroupUpdateGrid(context, control) {
	drawGroupWithoutArguments()
//	viewBroker.view.analysis.displayAnalysisControl.draw(context)
//	drawControls(context, viewBroker.view.analysis.displayAnalysisControl.controls)
}

function groupMouseMove(event) {
	drawGroupWithoutArguments()
}

function groupMouseOut() {
	drawGroupWithoutArguments()
	viewCanvas.mouseDown2D = undefined
	viewCanvas.mouseMoveManipulator = undefined
}

function groupMouseUp() {
	viewCanvas.mouseDown2D = undefined
	viewCanvas.mouseMoveManipulator = undefined
}

class GroupControl extends CanvasControl {
	constructor(boundingBox, halfSize) {
		super()
		this.boundingBox = boundingBox
		this.centerOffset = [viewCanvas.controlWidth, viewCanvas.controlWidth]
		this.clipBox = boundingBox
		this.halfSize = halfSize
	}
	drawPrivate(context) {
		var boundingBox = this.boundingBox
		var view = this.view
		clearBoundingBox(boundingBox, context)
		if (view.analysis.gridControl.getValue()) {
			drawPointsGrid(context, this, view)
		}
		for (var analysis of view.analysisPointsArray) {
			analysis.drawShape(boundingBox, context, this)
		}
	}
	mouseDownPrivate(context, event) {
		var view = this.view
		var analysis = view.analysis
		var name = view.editControl.getSelectedName()
		var point = getPointByEvent(this, event)
		var points = analysis.points
		var pointString = analysis.pointString
		if (name == 'Add') {
			var values = getValues(pointString)
			values.splice(analysis.addValueIndex, 0, view.mouseMovePoint.toString())
			setPointsInput(values.join(' '))
			outputPointsDrawPoints(analysis, context)
			return
		}

		if (name == 'Delete') {
			var closestPointIndex = getClosestPointIndex(point, analysis.points)
			if (closestPointIndex == undefined) {
				return
			}
			var values = getValues(pointString)
			values.splice(analysis.valueIndexes[closestPointIndex], 1)
			console.log(values)
			setPointsInput(values.join(' '))
			updateOutputDrawPoints(context, view)
			return
		}

		if (name == 'Move Shape') {
			if (analysis.points.length > 0) {
				viewCanvas.mouseMoveManipulator = movePointManipulator
				movePointManipulator.oldPoints = Polyline.copy(analysis.points)
				movePointManipulator.oldValues = getValues(pointString)
				analysis.closestPointIndex = getClosestPointIndex(point, analysis.points)
			}
			return
		}

		if (name == 'Inspect') {
			mouseDownGroupInspect(context, this, event)
			return
		}

		viewCanvas.mouseDownCenterOffset = view.centerOffset
		viewCanvas.mouseMoveManipulator = moveManipulator
	}
}

function mouseDownGroupInspect(context, control, event) {
	var view = control.view
	var analysis = view.analysis
	view.primaryAnalysis = view.analysis
	var points = analysis.points
	if (points.length == 0) {
		return
	}

	var inspectControl = analysis.inspectControl
	if (analysis.analysisControl.getValue() < 3) {
		analysis.analysisControl.setValue(1)
	}

	updateClosestPointIndex()
	analysis.analysisControl.draw(context)
	inspectControl.mousePoint = points[analysis.closestPointIndex]
	inspectControl.change = undefined
	if (inspectControl.last != undefined) {
		inspectControl.change = VectorFast.getSubtraction2D(inspectControl.mousePoint, inspectControl.last)
		inspectControl.change.push(VectorFast.length2D(inspectControl.change))
		inspectControl.lastDisplay = inspectControl.last
		if (inspectControl.change[2] < gClose) {
			inspectControl.change = undefined
		}
	}

	drawControls(context, analysis.shapeControls)
	inspectControl.last = inspectControl.mousePoint
}

class ViewGroup {
	constructor(analysisPointsArray, id) {
		this.analysis = analysisPointsArray[0]
		this.analysisPointsArray = analysisPointsArray
		this.id = id
	}
	draw(context) {
		if (this.centerOffset == undefined) {
			this.centerOffset = [viewCanvas.controlWidth, viewCanvas.controlWidth]
		}

		drawControls(context, this.controls, this)
	}
	mouseDown(context, event) {
		mouseDownControls(context, this.controls, event)
	}
	mouseMove(context, event) {
		this.mouseScreenPoint = [event.offsetX, event.offsetY]
		if (viewCanvas.mouseMoveManipulator == undefined && this.analysisPointsArray.length > 0) {
			var closestDistanceSquared = Number.MAX_VALUE
			var oldAnalysis = this.analysis
			var point = getPointByScreen(this.mouseScreenPoint, this.viewControl)
			if (isPointInsideBoundingBox(this.viewBoundingBox, this.mouseScreenPoint)) {
				for (var analysis of this.analysisPointsArray) {
					var points = analysis.points
					for (var vertexIndex = 0; vertexIndex < points.length; vertexIndex++) {
						var distanceSquared = VectorFast.distanceSquared2D(point, points[vertexIndex])
						if (distanceSquared < closestDistanceSquared) {
							this.analysis = analysis
							closestDistanceSquared = distanceSquared
						}
					}
				}
			}
			else {
				this.analysis = this.primaryAnalysis
			}
			if (oldAnalysis != this.analysis) {
				updateStatementOnly(oldAnalysis)
				oldAnalysis.clearIndexes()
				oldAnalysis.lineWidthMultiplier = gSecondaryLineWidthMultiplier
				removeByGeneratorName(this.controls, 'analysis')
				this.controls.push(this.analysis)
				this.analysis.closestPointIndex = undefined
				this.analysis.lineWidthMultiplier = 1.0
				this.analysis.updateView()
			}
			updateClosestPointIndex()
		}
		else {
			viewCanvas.mouseMoveManipulator.mouseMove(context, event)
		}

		this.analysis.mouseControl.draw(context)
	}
	mouseOut(context, event) {
		if (viewCanvas.mouseMoveManipulator != undefined) {
			viewCanvas.mouseMoveManipulator.mouseOut(context, event)
		}
	}
	mouseUp(context, event) {
		if (viewCanvas.mouseMoveManipulator != undefined) {
			viewCanvas.mouseMoveManipulator.mouseUp(context, event)
		}
	}
	start() {
		var controls = []
		var controlWidth = viewCanvas.controlWidth
		var height = viewBroker.canvas.height
		var valueMap = viewCanvas.valueMap
		var width = viewBroker.canvas.width
		this.controls = controls
		var intervals = Vector.intervalsFromToQuantity(0.0, height, 5, false)
		intervals.forEach(Math.round)

		this.viewBoundingBox = [[controlWidth, controlWidth], [viewBroker.heightMinus, viewBroker.heightMinus]]
		var halfSize = VectorFast.multiply2DScalar(VectorFast.getSubtraction2D(this.viewBoundingBox[1], this.viewBoundingBox[0]), 0.5)
		this.viewControl = new GroupControl(this.viewBoundingBox, halfSize)
		controls.push(this.viewControl)
		var zoomBoundingBox = [[viewBroker.heightMinus, controlWidth], [height, viewBroker.heightMinus]]
		this.zoomControl = new VerticalSlider(zoomBoundingBox, 0.0, 'Z', 1.0)
		this.zoomControl.controlChanged = drawPointsUpdateGrid
		controls.push(this.zoomControl)

		var texts = ['Add', 'Move Shape', 'Delete', 'Inspect', 'Move View']
		this.editControl = new Choice([[0, 0], [intervals[4], controlWidth]], texts)
		this.editControl.controlChanged = updateClosestPointIndex
		this.editControl.setValue(3)
		controls.push(this.editControl)

		setViewControls(controls, this)
		for (var analysis of this.analysisPointsArray) {
			analysis.view = this
			analysis.generatorName = 'analysis'
			setPointsInput(analysis, analysis.statement.attributeMap.get('points'))
			analysis.start()
		}

		controls.push(this.analysis)
		this.primaryAnalysis = this.analysis
		this.analysis.lineWidthMultiplier = gSecondaryLineWidthMultiplier
	}
}
