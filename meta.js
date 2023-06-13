//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gAlterationDisplay = ['alteration', 'display']
const gCopyTypeSet = new Set(['copy','row'])
const gLowerCharacterSet = new Set('abcdefghijklmnopqrstuvwxyz_'.split(''))
const gIDSet = new Set(['id'])
const gIDTransformWork = ['id', 'transform', 'transform3D', 'work']
const gIDPointsTransformWorkSet = new Set(gIDTransformWork.concat(['points', 'pointsHD']))
const gAlterationDisplayIDTransformWorkSet = new Set(gAlterationDisplay.concat(gIDTransformWork))
const gSetR = new Set(['r'])
const gSetS = new Set(['s'])
const gSetRS = new Set(['r', 's'])
var gWorkIDMap = new Map()

function addCells(registry, statement) {
	convertToGroup(statement)
	var cellStrings = statement.attributeMap.get('cells').split(' ').filter(lengthCheck)
	for (var cellString of cellStrings) {
		var cells = cellString.split(',').filter(lengthCheck)
		if (cells.length > 0) {
			var groupStatement = statement
			if (cells.length > 1) {
				groupStatement = getStatementByParentTag(new Map(), 1, statement, 'g')
				getStatementID(registry, groupStatement)
			}
			for (var cell of cells) {
				if (registry.idMap.has(cell)) {
					var workStatement = registry.idMap.get(cell)
					var child = getStatementByParentTag(new Map(), workStatement.nestingIncrement, groupStatement, workStatement.tag)
					getStatementID(registry, child)
					copyStatementRecursively(registry, child, workStatement)
				}
			}
		}
	}
}

function addEntriesToStatementLine(entries, registry, statement) {
	var line = registry.lines[statement.lineIndex]
	for (var entry of entries) {
		statement.attributeMap.set(entry[0], entry[1])
	}
	if (line.trim().startsWith('<')) {
		line = getLineByStatement(statement)
	}
	else {
		var attributePairs = []
		for (var entry of statement.attributeMap.entries()) {
			attributePairs.push(entry[0] + '=' + entry[1])
		}
		line = statement.tag + ' ' + attributePairs.join(' ')
	}
	registry.lines[statement.lineIndex] = line
	registry.lineUpdated = true
}

function addFunctionsToVariableEntries(functionsToAdd, optionSet) {
	for (var functionToAdd of functionsToAdd) {
		addFunctionToVariableEntries(functionToAdd, optionSet)
	}
}

function addFunctionToVariableEntries(functionToAdd, optionSet) {
	var functionName = functionToAdd.name
	if (functionName.endsWith('_Check')) {
		functionName = functionName.slice(0, -6)
	}
	addFunctionToEntriesByName(functionToAdd, gVariableMapEntries, functionName, optionSet)
}

function addFunctionToEntriesByName(functionToAdd, mapEntries, name, optionSet) {
	functionToAdd.optionSet = optionSet
	mapEntries.push([name, functionToAdd])
}

function addLineToParent(registry, statement) {
	if (registry.spreadsheetMap == undefined) {
		registry.spreadsheetMap = new Map()
	}
	var parentID = statement.parent.attributeMap.get('id')
	var rows = registry.spreadsheetMap.get(parentID, rows)
	if (rows == undefined) {
		rows = []
		registry.spreadsheetMap.set(parentID, rows)
	}
	var row = statement.attributeMap.get('line').split(getSpreadsheetDelimiter(statement.parent))
	if (row.filter(lengthCheck).length == 0) {
		row = []
	}
	rows.push(row)
}

function addMeshesRecursively(depth, meshes, registry, statement) {
	if (depth > gRecursionLimit) {
		return
	}
	var mesh = getMeshByID(statement.attributeMap.get('id'), registry)
	if (mesh != undefined) {
		meshes.push(getMeshCopy(mesh))
	}
	depth += 1

	for (var child of statement.children) {
		addMeshesRecursively(depth, meshes, registry, child)
	}
	return meshes
}

function addMeshesToGroupStatement(idStart, meshes, registry, statement) {
	for (var mesh of meshes) {
		var meshStatement = getStatementByParentTag(new Map(), 0, statement, 'mesh')
		copyKeysExcept(gIDPointsTransformWorkSet, statement.attributeMap, meshStatement.attributeMap)
		getUniqueID(idStart, registry, meshStatement)
		analyzeOutputMesh(getMeshCopy(mesh), registry, statement)
	}
	deleteKeysExcept(gIDPointsTransformWorkSet, statement.attributeMap)
}

function addMeshToStatement(inputArea, mesh, registry, statement) {
	if (mesh == null) {
		var facets = getPointsByKey('facets', registry, statement)
		var points = getPointsByKey('points', registry, statement)
		if (facets != undefined && points != undefined) {
			mesh = {facets:facets, points:points}
		}
	}
	else {
		if (getBooleanByDefault(false, 'updateStatement', registry, statement, statement.tag)) {
			var pointsString = getStringByArrays(mesh.points)
			addEntriesToStatementLine([['points', pointsString], ['facets', getStringByArrays(mesh.facets)]], registry, statement)
			inputArea.value = ''
		}
	}
	if (mesh != null) {
		analyzeOutputMesh(mesh, registry, statement)
	}
}

function addOutputArea(text, title) {
	if (getIsEmpty(text)) {
		return
	}
	var textAreaID = 'output_area_' + title
	var textArea = document.getElementById(textAreaID)
	if (textArea == null) {
		var heading = document.createElement('H3')
		heading.appendChild(document.createTextNode('Output - ' + title))
		document.body.appendChild(heading)
		textArea = document.createElement('textarea')
		textArea.cols = 120
		textArea.id = textAreaID
		textArea.rows = 4
		textArea.value = text
		document.body.appendChild(textArea)	
	}
	else {
		textArea.value = text
	}
}

function addPointsToGroupStatement(idStart, pointsStatements, registry, statement) {
	for (var pointsStatement of pointsStatements) {
		var tagStatement = getStatementByParentTag(new Map(), 0, statement, pointsStatement.statement.tag)
		copyKeysExcept(gIDPointsTransformWorkSet, statement.attributeMap, tagStatement.attributeMap)
		getUniqueID(idStart, registry, tagStatement)
		setPointsExcept(getArraysCopy(pointsStatement.points), registry, tagStatement)
	}
	deleteKeysExcept(gIDPointsTransformWorkSet, statement.attributeMap)
}

function addStatementRecursively(depth, parent, registry, workStatement) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 1,000 in addStatementRecursively reached, no further statements will be added.'
		warningByList([warningText, parent, gRecursionLimit])
		return
	}
	if (gCopyTypeSet.has(workStatement.tag)) {
		noticeByList(['Will not add a copy type statement in addStatementRecursively in meta.', statement, workStatement])
		return
	}
	var statement = getStatementByParentTag(new Map(), workStatement.nestingIncrement, parent, workStatement.tag)
	var workID = workStatement.attributeMap.get('id')
	gWorkIDMap.set(workID, getUniqueID(parent.attributeMap.get('id') + '_' + workID, registry, statement))
	copyMissingKeysExcept(gIDSet, workStatement.attributeMap, statement.attributeMap)
	if (workStatement.attributeMap.has('work')) {
		var workWorkID = workStatement.attributeMap.get('work')
		if (gWorkIDMap.has(workWorkID)) {
			statement.attributeMap.set('work', gWorkIDMap.get(workWorkID))
		}
	}
	var work2DMatrix = getMatrix2D(registry, workStatement)
	if (work2DMatrix != null) {
		statement.attributeMap.set('transform', 'matrix(' + work2DMatrix.toString() + ')')
	}
	var work3DMatrix = getMatrix3D(registry, workStatement)
	if (work3DMatrix != null) {
		statement.attributeMap.set('transform3D', 'matrix(' + work3DMatrix.toString() + ')')
	}
	depth += 1
	for (var child of workStatement.children) {
		addStatementRecursively(depth, statement, registry, child)
	}
}

function addVariableObjectToEntries(map, variableObject) {
	var propertyNames = Object.getOwnPropertyNames(variableObject)
	for (var propertyName of propertyNames) {
		if (gLowerCharacterSet.has(propertyName[0])) {
			map.set(propertyName, variableObject[propertyName])
			variableObject[propertyName].optionSet = null
		}
		else {
			map.set(propertyName, variableObject[propertyName].toString())
		}
	}
	return map
}

function alterStatementPoints(registry, statement) {
	var mesh = getMeshByID(statement.attributeMap.get('id'), registry)
	if (mesh != undefined) {
		alterMeshExcept(mesh, registry, statement)
		return
	}
	var points = getPointsHD(registry, statement)
	if (points != null) {
		setPointsHD(getPointsExcept(points, registry, statement), statement)
	}
}

function copyStatementRecursively(registry, statement, workStatement) {
	if (gCopyTypeSet.has(workStatement.tag)) {
		noticeByList(['Will not copy a copy type statement in copyStatementRecursively in meta.', statement, workStatement])
		return
	}
	copyMissingKeysExcept(gAlterationDisplayIDTransformWorkSet, workStatement.attributeMap, statement.attributeMap)
	var work2DMatrix = getChainSkipMatrix2D(registry, workStatement)
	if (work2DMatrix != null) {
		var statement2DMatrix = getMatrix2D(registry, statement)
		if (statement2DMatrix != null) {
			work2DMatrix = getMultiplied2DMatrix(statement2DMatrix, work2DMatrix)
		}
		statement.attributeMap.set('transform', 'matrix(' + work2DMatrix.toString() + ')')
	}
	var work3DMatrix = getChainMatrix3D(registry, workStatement)
	if (work3DMatrix != null) {
		var statement3DMatrix = getMatrix3D(registry, statement)
		if (statement3DMatrix != null) {
			work3DMatrix = getMultiplied3DMatrix(statement3DMatrix, work3DMatrix)
		}
		statement.attributeMap.set('transform3D', 'matrix(' + work3DMatrix.toString() + ')')
	}
	for (var child of workStatement.children) {
		addStatementRecursively(0, statement, registry, child)
	}
}

function getDistanceSquaredToStatement(location, registry, statement) {
	var points = getPointsHD(registry, statement)
	var workMesh = getMeshByID(statement.attributeMap.get('id'), registry)
	if (workMesh != undefined) {
		points = workMesh.points
	}
	if (getIsEmpty(points)) {
		return Number.MAX_VALUE
	}
	var closestDistanceSquared = Number.MAX_VALUE
	for (var point of points) {
		var distanceSquared = distanceSquaredArray(location, point, 3)
		if (distanceSquared < closestDistanceSquared) {
			closestDistanceSquared = distanceSquared
		}
	}
	return closestDistanceSquared
}

function getGroupBoundingBox(caller, registry, statement) {
	var boundingBox = null
	var descendants = []
	addToDescendantsInsideFirst(descendants, statement)
	for (var child of descendants) {
		boundingBox = widenStatementBoundingBox(boundingBox, caller, registry, child)
	}
	return boundingBox
}

function getGroupBoundingBoxByArguments(id, registry, statement) {
	var groupStatement = getStatementByID(registry, statement, id)
	if (statement != groupStatement) {
		for (var whileCount = 0; whileCount < gLengthLimitRoot; whileCount++) {
			if (statement.attributeMap.get('id') == id) {
				noticeByList(['Infinitely nested bounding box in getGroupBoundingBoxByArguments in function.', id, statement])
				return [[0.0, 0.0], [0.0, 0.0]]
			}
			statement = statement.parent
			if (statement == undefined) {
				break
			}
		}
	}
	return getGroupBoundingBox(groupStatement, registry, groupStatement)
}

function getInputArea(title) {
	var textAreaID = 'input_area_' + title
	var textArea = document.getElementById(textAreaID)
	if (textArea == null) {
		var heading = document.createElement('H3')
		heading.appendChild(document.createTextNode('Input - ' + title))
		document.body.appendChild(heading)
		textArea = document.createElement('textarea')
		textArea.cols = 120
		textArea.id = textAreaID
		textArea.rows = 4
		document.body.appendChild(textArea)	
	}
	return textArea
}

function getMatrix2DsBySuffix(attributeMap, registry, statement, suffix) {
	var matrix2Ds = getPointsByKey(getSuffixedString('matrix2D', suffix), registry, statement)
	if (matrix2Ds == null) {
		matrix2Ds = []
	}
	var suffixedPlanes = getSuffixedString('plane', suffix)
	var planes = getPointsByKey(suffixedPlanes, registry, statement)
	if (planes != null) {
		for (var plane of planes) {
			matrix2Ds.push(getMatrix2DByPlane(plane))
		}
		attributeMap.set(suffixedPlanes, planes.join(' '))
	}
	var suffixedPolars = getSuffixedString('polar', suffix)
	var polars = getPointsByKey(suffixedPolars, registry, statement)
	if (polars != null) {
		for (var polar of polars) {
			matrix2Ds.push(getMatrix2DByPolar(polar))
		}
		attributeMap.set(suffixedPolars, polars.join(' '))
	}
	var workPoints = null
	if (suffix == null) {
		var workStatement = getWorkStatement(registry, statement)
		if (workStatement != undefined) {
			workPoints = getPointsHD(registry, workStatement)
		}
	}
	var suffixedPolygon = getSuffixedString('polygon', suffix)
	var polygon = getPointsByKey(suffixedPolygon, registry, statement)
	var suffixedPolyline = getSuffixedString('polyline', suffix)
	var polyline = getPointsByKey(getSuffixedString('polyline', suffix), registry, statement)
	if (workPoints != null) {
		if (workStatement.tag == 'polygon') {
			polygon = getPushArray(polygon, workPoints)
		}
		else {
			if (workStatement.tag == 'polyline') {
				polyline= getPushArray(polygon, workPoints)
			}
		}
	}
	var suffixedScalePortion = getSuffixedString('scalePortion', suffix)
	var scalePortion = getFloatsByStatement(suffixedScalePortion, registry, statement)
	if (!getIsEmpty(scalePortion)) {
		if (scalePortion.length == 1) {
			scalePortion.push(scalePortion[0])
		}
		attributeMap.set(suffixedScalePortion, scalePortion.join(','))
	}
	if (polygon != null) {
		for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
			var nextIndex = (pointIndex + 1) % polygon.length
			matrix2Ds.push(getMatrix2DBySegmentPortion(polygon[pointIndex], polygon[nextIndex], scalePortion))
		}
		attributeMap.set(suffixedPolygon, polygon.join(' '))
	}
	if (polyline != null) {
		for (var pointIndex = 0; pointIndex < polyline.length - 1; pointIndex++) {
			matrix2Ds.push(getMatrix2DBySegmentPortion(polyline[pointIndex], polyline[pointIndex + 1], scalePortion))
		}
		attributeMap.set(suffixedPolyline, polyline.join(' '))
	}
	var suffixedScale = getSuffixedString('scale', suffix)
	var scale = getFloatsByStatement(suffixedScale, registry, statement)
	if (matrix2Ds.length > 0) {
		if (!getIsEmpty(scale)) {
			if (scale.length == 1) {
				scale.push(scale[0])
			}
			for (var matrix2D of matrix2Ds) {
				matrix2D[0] *= scale[0]
				matrix2D[1] *= scale[0]
				matrix2D[2] *= scale[1]
				matrix2D[3] *= scale[1]
			}
			attributeMap.set(suffixedScale, scale.join(','))
		}
	}
	return matrix2Ds
}

function getMatrix3DsBySuffix(attributeMap, registry, statement, suffix) {
	var matrix3Ds = getPointsByKey(getSuffixedString('matrix3D', suffix), registry, statement)
	if (matrix3Ds == null) {
		matrix3Ds = []
	}
	var suffixedPlanes = getSuffixedString('plane', suffix)
	var planes = getPointsByKey(suffixedPlanes, registry, statement)
	if (planes != null) {
		for (var plane of planes) {
			matrix3Ds.push(getMatrix3DByTranslate(plane))
		}
		attributeMap.set(suffixedPlanes, planes.join(' '))
	}
	var suffixedPolars = getSuffixedString('polar', suffix)
	var polars = getPointsByKey(suffixedPolars, registry, statement)
	if (polars != null) {
		for (var polar of polars) {
			matrix3Ds.push(getMatrix3DByPolar(polar))
		}
		attributeMap.set(suffixedPolars, polars.join(' '))
	}
	var workPoints = null
	if (suffix == null) {
		var workStatement = getWorkStatement(registry, statement)
		if (workStatement != undefined) {
			workPoints = getPointsHD(registry, workStatement)
		}
	}
	var suffixedPolygon = getSuffixedString('polygon', suffix)
	var polygon = getPointsByKey(suffixedPolygon, registry, statement)
	var suffixedPolyline = getSuffixedString('polyline', suffix)
	var polyline = getPointsByKey(getSuffixedString('polyline', suffix), registry, statement)
	if (workPoints != null) {
		if (workStatement.tag == 'polygon') {
			polygon = getPushArray(polygon, workPoints)
		}
		else {
			if (workStatement.tag == 'polyline') {
				polyline= getPushArray(polygon, workPoints)
			}
		}
	}
	var suffixedScalePortion = getSuffixedString('scalePortion', suffix)
	var scalePortion = getFloatsByStatement(suffixedScalePortion, registry, statement)
	if (!getIsEmpty(scalePortion)) {
		if (scalePortion.length == 1) {
			scalePortion.push(scalePortion[0])
		}
		attributeMap.set(suffixedScalePortion, scalePortion.join(','))
	}
	if (polygon != null) {
		for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
			var nextIndex = (pointIndex + 1) % polygon.length
			matrix3Ds.push(getMatrix3DBySegmentPortion(polygon[pointIndex], polygon[nextIndex], scalePortion))
		}
		attributeMap.set(suffixedPolygon, polygon.join(' '))
	}
	if (polyline != null) {
		for (var pointIndex = 0; pointIndex < polyline.length - 1; pointIndex++) {
			matrix3Ds.push(getMatrix3DBySegmentPortion(polyline[pointIndex], polyline[pointIndex + 1], scalePortion))
		}
		attributeMap.set(suffixedPolyline, polyline.join(' '))
	}
	var suffixedScale = getSuffixedString('scale', suffix)
	var scale = getFloatsByStatement(suffixedScale, registry, statement)
	if (matrix3Ds.length > 0) {
		if (!getIsEmpty(scale)) {
			if (scale.length == 1) {
				scale.push(scale[0])
			}
			if (scale.length == 2) {
				scale.push(scale[1])
			}
			for (var matrix3D of matrix3Ds) {
				matrix3D[0] *= scale[0]
				matrix3D[1] *= scale[0]
				matrix3D[2] *= scale[0]
				matrix3D[4] *= scale[1]
				matrix3D[5] *= scale[1]
				matrix3D[6] *= scale[1]
				matrix3D[8] *= scale[2]
				matrix3D[9] *= scale[2]
				matrix3D[10] *= scale[2]
			}
			attributeMap.set(suffixedScale, scale.join(','))
		}
	}
	return matrix3Ds
}

function getMeshByID(id, registry) {
	return registry.meshMap.get(id)
}

function getOutputOrWorkOrID(attributeMap) {
	if (attributeMap.has('output')) {
		return attributeMap.get('output')
	}
	if (attributeMap.has('work')) {
		return attributeMap.get('work')
	}
	return attributeMap.get('id')
}

function getSpreadsheetDelimiter(statement) {
	if (statement.attributeMap.has('delimiter')) {
		return statement.attributeMap.get('delimiter')
	}
	return '\t'
}

function getStatementByID(registry, statement, id) {
	if (id == undefined) {
		return statement
	}
	id = id.trim()
	if (id.length == 0) {
		return statement
	}
	if (id[0] == ('/')) {
		for (var depth = 0; depth < gRecursionLimit; depth++) {
			if (statement.parent == undefined) {
				return statement
			}
			statement = statement.parent
		}
		return statement
	}
	if (id[0] != ('.')) {
		if (registry.idMap.has(id)) {
			return registry.idMap.get(id)
		}
		return statement
	}
	for (var character of id) {
		if (statement.parent == undefined) {
			return statement
		}
		statement = statement.parent
	}
	return statement
}

function getSuffixedString(root, suffix) {
	if (suffix == null) {
		return root
	}
	return root + suffix
}

function replaceRows(lines, registry, statement) {
	var endMinusLine = statement.endIndex - statement.lineIndex
	if (endMinusLine == 0) {
		var endLine = '}'
		if (registry.lines[statement.lineIndex].trim().startsWith('<')) {
			endLine = '</>'
		}
		lines.splice(statement.lineIndex + 1, 0, endLine)
	}
	lines.splice(statement.lineIndex + 1, endMinusLine - 1)
	spliceArray(lines, statement.lineIndex + 1, statement.rows)
	registry.lineUpdated = true
}

function setClosestStatementRecursively(closestDistanceStatement, depth, location, registry, statement) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 1,000 in getClosestStatementRecursively reached, no further statements will be searched.'
		warningByList([warningText, statement, gRecursionLimit])
		return
	}
	var distance = getDistanceSquaredToStatement(location, registry, statement)
	if (distance < closestDistanceStatement.distance) {
		closestDistanceStatement.distance = distance
		closestDistanceStatement.statement = statement
	}
	depth += 1
	if (getMeshByID(statement.attributeMap.get('id'), registry) == undefined) {
		for (var child of statement.children) {
			setClosestStatementRecursively(closestDistanceStatement, depth, location, registry, child)
		}
	}
}

function ViewImage() {
	this.draw = function() {
		if (this.image == undefined) {
			this.image = new Image()
			this.image.src = this.filename
		}
		clearBoundingBox(this.controlBoundingBox, viewBroker.context)
		if (this.image.complete) {
			if (this.height == null) {
				var greatestDimension = Math.max(this.image.naturalHeight, this.image.naturalWidth)
				var zoomRatio = 1.0 * viewBroker.canvas.height / greatestDimension
				this.height = zoomRatio * this.image.naturalHeight
				this.width = zoomRatio * this.image.naturalWidth
				this.halfCanvasMinus = viewBroker.halfWidth - this.width / 2
				this.canvasHeightMinus = viewBroker.canvas.height - this.height
			}
			viewBroker.context.drawImage(this.image, this.halfCanvasMinus, this.canvasHeightMinus, this.width, this.height)
		}
		else {
			this.image.onload = wordscapeViewerDraw
		}
	}
	this.height = null
	this.isDownloadHidden = true
	this.mouseDown = function(event) {
		this.polyline.push(viewBroker.mouseDown2D)
		var boundingBox = getBoundingBox(this.polyline)
		var minimumPoint = boundingBox[0]
		var size = getSubtraction2D(boundingBox[1], minimumPoint)
		var maximumDimension = Math.max(Math.max(size[0], size[1]), 1.0)
		var fittedString = ''
		var multiplier = 100.0 / maximumDimension
		for (var fittedIndex = 0; fittedIndex < this.polyline.length; fittedIndex++) {
			var point = this.polyline[fittedIndex]
			var x = multiplier * (point[0] - minimumPoint[0])
			var y = multiplier * (boundingBox[1][1] - point[1])
			fittedString += x.toFixed(1) + ',' + y.toFixed(1) + ' '
		}
		console.log(fittedString)
	}
	this.mouseMove = function(event) {
		var characterBegin = viewBroker.analysisCharacterStart
		var context = viewBroker.context
		context.clearRect(characterBegin, 0, viewBroker.canvas.width, viewBroker.doubleTextSpace + 1)
		setTextContext(context)
		context.textAlign = 'left'
		context.fillText('x :  ' + event.offsetX, characterBegin, viewBroker.textSpace)
		context.fillText('y :  ' + event.offsetY, characterBegin, viewBroker.doubleTextSpace)
	}
	this.mouseOut = function(event) {
	}
	this.mouseUp = function(event) {
	}
	this.polyline = []
	this.start = function() {
		this.controlBoundingBox = [[0, 0], [viewBroker.canvas.height, viewBroker.canvas.height]]
	}
}

function workMesh(registry, statement, propertyName) {
	var attributeMap = statement.attributeMap
	if (!attributeMap.has('work')) {
		return null
	}
	var work = attributeMap.get('work')
	if (work.startsWith("'") || work.startsWith('"')) {
		work = work.slice(1)
	}
	if (work.endsWith("'") || work.endsWith('"')) {
		work = work.slice(0, -1)
	}
	var workMesh = getMeshByID(work, registry)
	if (workMesh == undefined) {
		return null
	}
	if (workMesh[propertyName] == undefined) {
		return null
	}
	return workMesh[propertyName].toString()
}

var gAbstract = {
	initialize: function() {
		gParentFirstSet.add(this.name)
		gTagCenterMap.set(this.name, this)
	},
	name: 'abstract',
	processStatement: function(registry, statement) {
		statement.tag = 'g'
		var attributeMap = statement.attributeMap
		setMapIfMissing('font-weight', attributeMap, 'normal')
		setMapIfMissing('skip2D', attributeMap, 'true')
		setMapIfMissing('skip3D', attributeMap, 'true')
		setMapIfMissing('style', attributeMap, 'fill:none;stroke:black;stroke-width:1')
		var flipY = getFloatByStatement('flipY', registry, statement)
		if (flipY != undefined) {
			scaleString = 'scale(' + flipY + ',' + (-flipY) + ')'
			attributeMap.set('transform', scaleString)
		}
		titleStrings = []
		gProject = null
		if (attributeMap.has('project')) {
			gProject = attributeMap.get('project')
			if (gProject != 'untitled') {
				titleStrings.push(gProject)
				registry.dataMap.set('project', gProject)
			}
		}
		gAbstractID = null
		if (attributeMap.has('id')) {
			gAbstractID = attributeMap.get('id')
			if (gAbstractID != 'untitled' && gAbstractID != 'abstract' && gAbstractID != gProject) {
				titleStrings.push(gAbstractID)
				registry.dataMap.set('abstractID', gAbstractID)
			}
		}
		gDate = null
		if (attributeMap.has('date')) {
			gDate = attributeMap.get('date')
			titleStrings.push(gDate)
			registry.dataMap.set('date', gDate)
		}
		gTitle = titleStrings.join('_')
		titleStrings.push('Wordscape')
		document.title = titleStrings.join(' - ')
	}
}

var gCopy = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'copy',
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		if (!attributeMap.has('work')) {
			noticeByList(['No work attribute in copy in meta.', statement])
			return
		}
		var workID = attributeMap.get('work')
		if (!registry.idMap.has(workID)) {
			noticeByList(['No work could be found for copy in meta.', workID, statement])
			return
		}
		var workStatement = registry.idMap.get(workID)
		var location = getFloatsByStatement('location', registry, statement)
		if (location != null) {
			var closestDistanceStatement = {distance:Number.MAX_VALUE, statement:null}
			setClosestStatementRecursively(closestDistanceStatement, 0, location, registry, workStatement)
			workStatement = closestDistanceStatement.statement
			if (workStatement == null) {
				noticeByList(['No objects to find closest to location in copy in meta.', workStatement, statement])
				return
			}
		}
		if (statement.nestingIncrement == 0) {
			statement.nestingIncrement = workStatement.nestingIncrement
			statement.tag = workStatement.tag
			copyStatementRecursively(registry, statement, workStatement)
			return
		}
		var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
		var matrix3Ds = getMatrix3DsByChildren(statement.children, registry)
		if (getIsEmpty(matrix2Ds) && getIsEmpty(matrix3Ds)) {
			noticeByList(['No matrix2D or matrix3D in gCopy', statement])
			return
		}
		statement.tag = 'g'
		for (var matrix2D of matrix2Ds) {
			var matrixStatement = getStatementByParentTag(new Map(), workStatement.nestingIncrement, statement, workStatement.tag)
			getUniqueID(statement.attributeMap.get('id') + '_' + workStatement.attributeMap.get('id'), registry, matrixStatement)
			matrixStatement.attributeMap.set('transform', 'matrix(' + matrix2D.toString() + ')')
			copyStatementRecursively(registry, matrixStatement, workStatement)
		}
		for (var matrix3D of matrix3Ds) {
			var matrixStatement = getStatementByParentTag(new Map(), workStatement.nestingIncrement, statement, workStatement.tag)
			getUniqueID(statement.attributeMap.get('id') + '_' + workStatement.attributeMap.get('id'), registry, matrixStatement)
			matrixStatement.attributeMap.set('transform3D', 'matrix(' + matrix3D.toString() + ')')
			copyStatementRecursively(registry, matrixStatement, workStatement)
		}
	}
}

var gCopyMesh = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'copyMesh',
	processStatement: function(registry, statement) {
		var workID = statement.attributeMap.get('work')
		if (!registry.idMap.has(workID)) {
			noticeByList(['No work could be found for copyMesh in meta.', statement])
			return
		}
		var meshes = []
		var searchDepth = getIntByDefault(gRecursionLimit, 'searchDepth', registry, statement, this.name)
		addMeshesRecursively(gRecursionLimit - searchDepth, meshes, registry, registry.idMap.get(workID))
		if (meshes.length == 0) {
			noticeByList(['No meshes could be found for copyMesh in meta.', statement])
			return
		}
		var matrix3D = getChainMatrix3D(registry, statement)
		for (var mesh of meshes) {
			transform3DPoints(matrix3D, mesh.points)
		}
		var idStart = statement.attributeMap.get('id') + '_' + workID
		if (statement.nestingIncrement == 0) {
			if (meshes.length == 1) {
				statement.tag = 'mesh'
				analyzeOutputMesh(getMeshCopy(meshes[0]), registry, statement)
				return
			}
			convertToGroup(statement)
			addMeshesToGroupStatement(idStart, meshes, registry, statement)
			return
		}
		statement.tag = 'g'
		var matrix3Ds = getMatrix3DsByChildren(statement.children, registry)
		if (getIsEmpty(matrix3Ds)) {
			noticeByList(['No matrix3D in gCopyMesh in meta.', statement])
			return
		}
		for (var matrix3D of matrix3Ds) {
			var matrixAttributeMap = new Map([['transform3D', 'matrix(' + matrix3D.toString() + ')']])
			copyKeysExcept(gIDPointsTransformWorkSet, statement.attributeMap, matrixAttributeMap)
			var matrixStatement = getStatementByParentTag(matrixAttributeMap, 0, statement, 'mesh')
			getUniqueID(idStart, registry, matrixStatement)
			if (meshes.length == 1) {
				analyzeOutputMesh(getMeshCopy(meshes[0]), registry, matrixStatement)
			}
			else {
				convertToGroup(matrixStatement)
				addMeshesToGroupStatement(matrixAttributeMap.get('id'), meshes, registry, matrixStatement)
			}
		}
		deleteKeysExcept(gIDPointsTransformWorkSet, statement.attributeMap)
	}
}

var gCopyPoints = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'copyPoints',
	processStatement: function(registry, statement) {
		var workID = statement.attributeMap.get('work')
		if (!registry.idMap.has(workID)) {
			return
		}
		var workStatement = registry.idMap.get(workID)
		var pointsStatements = []
		addToTagStatementsRecursivelyByDepth(undefined, 0, 1, pointsStatements, registry, workStatement, 'polygon')
		addToTagStatementsRecursivelyByDepth(undefined, 0, 1, pointsStatements, registry, workStatement, 'polyline')
		if (getIsEmpty(pointsStatements)) {
			noticeByList(['No points statements could be found for gCopyPoints in meta.', statement])
			return
		}
		var idStart = statement.attributeMap.get('id') + '_' + workID
		if (statement.nestingIncrement == 0) {
			if (pointsStatements.length == 1) {
				statement.tag = pointsStatements[0].statement.tag
				setPointsExcept(getArraysCopy(pointsStatements[0].points), registry, statement)
				return
			}
			convertToGroup(statement)
			addPointsToGroupStatement(idStart, pointsStatements, registry, statement)
			return
		}
		statement.tag = 'g'
		var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
		if (getIsEmpty(matrix2Ds)) {
			noticeByList(['No matrix2D in gCopyPoints in meta.', statement])
			return
		}
		for (var matrix2D of matrix2Ds) {
			var matrixAttributeMap = new Map([['transform', 'matrix(' + matrix2D.toString() + ')']])
			copyKeysExcept(gIDPointsTransformWorkSet, statement.attributeMap, matrixAttributeMap)
			var matrixStatement = getStatementByParentTag(matrixAttributeMap, 0, statement, pointsStatements[0].statement.tag)
			getUniqueID(idStart, registry, matrixStatement)
			if (pointsStatements.length == 1) {
				setPointsExcept(getArraysCopy(pointsStatements[0].points), registry, matrixStatement)
			}
			else {
				convertToGroup(matrixStatement)
				addPointsToGroupStatement(matrixAttributeMap.get('id'), pointsStatements, registry, matrixStatement)
			}
		}
		deleteKeysExcept(gIDPointsTransformWorkSet, statement.attributeMap)
	}
}

var gDelete = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'delete',
	processStatement: function(registry, statement) {
		if (getBooleanByDefault(true, 'delete', registry, statement, this.name)) {
			var workStatements = getWorkStatements(registry, statement)
			for (var workStatement of workStatements) {
				deleteStatement(workStatement)
			}
		}
	}
}

var gGroup = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
		gTagCenterMap.set('g', this)
	},
	name: 'group',
	processStatement: function(registry, statement) {
		statement.tag = 'g'
		getMatrix2D(registry, statement)
	}
}

var gHelp = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'help',
	processStatement: function(registry, statement) {
		console.log(getTagKeys())
	}
}

var gMatrix2D = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'matrix2D',
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		var matrix2Ds = getMatrix2DsBySuffix(attributeMap, registry, statement, null)
		if (matrix2Ds.length == 0) {
			return
		}
		for (var depth = 1; depth < gRecursionLimit; depth++) {
			var depthTransform2Ds = getMatrix2DsBySuffix(attributeMap, registry, statement, '_' + depth.toString())
			if (depthTransform2Ds.length == 0) {
				break
			}
			else {
				var count = 0
				var newTransform2Ds = new Array(depthTransform2Ds.length * matrix2Ds.length)
				for (var depthTransform2D of depthTransform2Ds) {
					for (var matrix2D of matrix2Ds) {
						newTransform2Ds[count] = getMultiplied2DMatrix(depthTransform2D, matrix2D)
						count++
					}
				}
				matrix2Ds = newTransform2Ds
			}
		}
		attributeMap.set('matrix2D', matrix2Ds.join(' '))
	}
}

var gMatrix3D = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'matrix3D',
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		var matrix3Ds = getMatrix3DsBySuffix(attributeMap, registry, statement, null)
		if (matrix3Ds.length == 0) {
			return
		}
		for (var depth = 1; depth < gRecursionLimit; depth++) {
			var depthMatrix3Ds = getMatrix3DsBySuffix(attributeMap, registry, statement, '_' + depth.toString())
			if (depthMatrix3Ds.length == 0) {
				break
			}
			else {
				var count = 0
				var newMatrix3Ds = new Array(depthMatrix3Ds.length * matrix3Ds.length)
				for (var depthMatrix3D of depthMatrix3Ds) {
					for (var matrix3D of matrix3Ds) {
						newMatrix3Ds[count] = getMultiplied3DMatrix(depthMatrix3D, matrix3D)
						count++
					}
				}
				matrix3Ds = newMatrix3Ds
			}
		}
		attributeMap.set('matrix3D', matrix3Ds.join(' '))
	}
}

var gPolygonAnalysis = {
	alterMesh: function(mesh, registry, statement) {
		if (mesh == null) {
			return
		}
		var normal = getPoint3DByStatement('normal', registry, statement)
		var analysisStatement = getStatementByParentTag(getMeshAnalysis(mesh, normal), 0, statement, 'polygonAnalysis')
		setIDMapSet(statement.attributeMap.get('id') + '_polygonAnalysis', registry, analysisStatement)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'polygonAnalysis',
	processStatement: function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == undefined) {
			noticeByList(['No workMesh could be found for polygonAnalysis in meta.', statement])
			return
		}
		copyMissingKeys(getMeshAnalysis(workMesh, getPoint3DByStatement('normal', registry, statement)), statement.attributeMap)
	}
}

var gProcess = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'process',
	processStatement: function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)

		if (workStatements.length > 0) {
			for (var workStatement of workStatements) {
				copyKeysExcept(gIDPointsTransformWorkSet, statement.attributeMap, workStatement.attributeMap)
				var descendants = []
				addToDescendantsInsideFirst(descendants, workStatement)
				descendants.push(workStatement)
				processStatementsByTagMap(new Set(), registry, descendants, gTagCenterMap)
			}
			return
		}
		noticeByList(['No work attribute in process in meta.', statement])
	}
}

var gRow = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'row',
	processStatement: function(registry, statement) {
		if (statement.attributeMap.has('cells')) {
			addCells(registry, statement)
			return
		}
		if (statement.attributeMap.has('line')) {
			addLineToParent(registry, statement)
			return
		}
		noticeByList(['No line or cells could be found for row in meta.', statement])
	}
}

var gSpreadsheet = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'spreadsheet',
	processStatement: function(registry, statement) {
		statement.tag = 'g'
		var id = statement.attributeMap.get('id')
		var spreadsheetInputArea = getInputArea('Spreadsheet - ' + id)
		var text = spreadsheetInputArea.value
		var lines = []
		if (text.length > 0) {
			lines = text.split(getEndOfLine(text))
			for (var lineIndex = lines.length - 1; lineIndex > -1; lineIndex--) {
				if (lines[lineIndex].length == 0) {
					lines.length -= 1
				}
				else {
					break
				}
			}
		}
		if (lines.length == 0) {
			return
		}
		var delimiter = getSpreadsheetDelimiter(statement)
		var rows = new Array(lines.length)
		statement.rows = new Array(lines.length)
		for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
			rows[lineIndex] = lines[lineIndex].split(delimiter)
			statement.rows[lineIndex] = 'row line=' + lines[lineIndex]
		}
		if (getBooleanByDefault(false, 'updateStatement', registry, statement, this.name)) {
			if (registry.indexStatements == undefined) {
				registry.indexStatements = []
			}
			var indexStatement = [statement.lineIndex, statement]
			registry.indexStatements.push(indexStatement)
			spreadsheetInputArea.value = ''
			if (statement.nestingIncrement > 0) {
				statement.endIndex = statement.lineIndex + 1
				for (; statement.endIndex < registry.lines.length; statement.endIndex++) {
					var lineStatement = getStatement(registry.lines[statement.endIndex])
					if (lineStatement.nestingIncrement < 0) {
						break
					}
				}
			}
			else {
				statement.endIndex = statement.lineIndex
				var line = registry.lines[statement.lineIndex].trim()
				if (line.startsWith('<')) {
					if (line.endsWith('/>')) {
						registry.lines[statement.lineIndex] = line.slice(0, line.length - 2) + '>'
					}
				}
				else {
					registry.lines[statement.lineIndex] += ' {'
				}
				convertToGroup(statement)
			}
			var idStart = id + '_row_'
			statement.children.length = 0
			for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
				var rowStatement = getStatementByParentTag(new Map([['line', lines[lineIndex]]]), 0, statement, 'row')
				getUniqueID(idStart + lineIndex.toString(), registry, rowStatement)
			}
		}
		if (registry.spreadsheetMap == undefined) {
			registry.spreadsheetMap = new Map()
		}
		registry.spreadsheetMap.set(id, rows)
	}
}

var gSTL = {
	alterMesh: function(mesh, registry, statement) {
		var id = getOutputOrWorkOrID(statement.attributeMap)
		addOutputArea(getSTLMeshString(id, mesh), 'STL - ' + id)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'stl',
	processStatement: function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)

		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		noticeByList(['No workMesh could be found for stl in meta.', statement])
	}
}

var gSTLInput = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'stlInput',
	processStatement: function(registry, statement) {
		var id = statement.attributeMap.get('id')
		var stlInputArea = getInputArea('STL - ' + id)
		addMeshToStatement(stlInputArea, getMeshBySTL(id, stlInputArea.value), registry, statement)
	}
}

var gString = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'string',
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		var variableMap = getVariableMapByStatement(statement.parent)
		for (var key of attributeMap.keys()) {
			if (key != 'id') {
				variableMap.set(key, attributeMap.get(key))
			}
		}
	}
}

var gTriangleAnalysis = {
	alterMesh: function(mesh, registry, statement) {
		var normal = getPoint3DByStatement('normal', registry, statement)
		var analysisStatement = getStatementByParentTag(getMeshAnalysis(getTriangleMesh(mesh), normal), 0, statement, 'triangleAnalysis')
		setIDMapSet(statement.attributeMap.get('id') + '_triangleAnalysis', registry, analysisStatement)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'triangleAnalysis',
	processStatement: function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)

		if (workMesh == undefined) {
			noticeByList(['No workMesh could be found for triangleAnalysis in meta.', statement])
			return
		}
		workMesh = getTriangleMesh(workMesh)
		copyMissingKeys(getMeshAnalysis(workMesh, getPoint3DByStatement('normal', registry, statement)), statement.attributeMap)
	}
}

var gTSV = {
	alterMesh: function(mesh, registry, statement) {
		var id = getOutputOrWorkOrID(statement.attributeMap)
		var date = getNullOrValue('date', registry.dataMap)
		addOutputArea(getTSVMeshString(date, id, mesh, getNullOrValue('project', registry.dataMap)), 'TSV - ' + id)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'tsv',
	processStatement: function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)

		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		noticeByList(['No workMesh could be found for tsv in meta.', statement])
	}
}

var gTSVInput = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'tsvInput',
	processStatement: function(registry, statement) {
		var id = statement.attributeMap.get('id')
		var tsvInputArea = getInputArea('TSV - ' + id)
		addMeshToStatement(tsvInputArea, getMeshByTSV(tsvInputArea.value), registry, statement)
	}
}

/* deprecated24
var gURL = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'url',
	processStatement: function(registry, statement) {
		gURLMaximumLength = getIntByDefault(gURLMaximumLength, 'maximumLength', registry, statement, this.name)
	}
}
*/

var gVar = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
		addFunctionsToVariableEntries([add2D_Check, add3D_Check, addArray_Check], null)
		addFunctionsToVariableEntries([additionInterpolation, additionInterpolation2D, additionInterpolation3D], null)
		addFunctionToVariableEntries(alongsFromToDistance, null)
		addFunctionToVariableEntries(arcBeforeFromTo, gSetR)
		addFunctionToVariableEntries(arcCenterRadius, null)
		addFunctionToVariableEntries(arcFromToAngle, gSetR)
		addFunctionToVariableEntries(arcFromToRadius, gSetR)
		addFunctionToVariableEntries(arcTo, gSetR)
		addFunctionToVariableEntries(arcToAngle, gSetR)
		addFunctionToVariableEntries(arcToRadius, gSetR)
		addFunctionToVariableEntries(arcWaveXFromToHeight, null)
		addFunctionToVariableEntries(arcYXFromToHeight, null)
		addFunctionToVariableEntries(arrayAtIndex_Check, null)
		addFunctionToVariableEntries(attributeByIDKey, gSetRS)
		addFunctionToVariableEntries(border, gSetRS)
		addFunctionToVariableEntries(bracket, null)
		addFunctionsToVariableEntries([crossProduct_Check, crossProduct2D_Check], null)
		addFunctionsToVariableEntries([distance2D_Check, distanceSquared2D_Check, distance3D_Check, distanceSquared3D_Check], null)
		addFunctionsToVariableEntries([distanceArray_Check, distanceSquaredArray_Check], null)
		addFunctionsToVariableEntries([divide2D_Check, divide2DScalar_Check, divide3D_Check, divide3DScalar_Check], null)
		addFunctionsToVariableEntries([divideArray_Check, divideArrayScalar_Check], null)
		addFunctionToVariableEntries(ellipseFromToRadius, gSetR)
		addFunctionToVariableEntries(ellipseToRadius, gSetR)
		addFunctionToVariableEntries(floatByIDKey, gSetRS)
		addFunctionToVariableEntries(floatByKeyID, gSetRS)
		addFunctionsToVariableEntries([getAddition2D_Check, getAddition3D_Check, getAdditionArray_Check], null)
		addFunctionsToVariableEntries([getDivision2D_Check, getDivision2DScalar_Check], null)
		addFunctionsToVariableEntries([getDivision3D_Check, getDivision3DScalar_Check], null)
		addFunctionsToVariableEntries([getDivisionArray_Check, getDivisionArrayScalar_Check], null)
		addFunctionsToVariableEntries([getMultiplication2D_Check, getMultiplication2DScalar_Check], null)
		addFunctionsToVariableEntries([getMultiplication3D_Check, getMultiplication3DScalar_Check], null)
		addFunctionsToVariableEntries([getMultiplicationArray_Check, getMultiplicationArrayScalar_Check], null)
		addFunctionsToVariableEntries([getSubtraction2D_Check, getSubtraction3D_Check, getSubtractionArray_Check], null)
		addFunctionToVariableEntries(insetsHeightAngle, null)
		addFunctionsToVariableEntries([intervalFromToBetween, intervalsFromQuantityIncrement, intervalsFromToAlong], null)
		addFunctionsToVariableEntries([intervalsFromToBetween, intervalsFromToIncrement, intervalsFromToQuantity], null)
		addFunctionToVariableEntries(joinPoints, gSetR)
		addFunctionsToVariableEntries([length2D_Check, lengthSquared2D_Check, length3D_Check], null)
		addFunctionsToVariableEntries([lengthSquared3D_Check, lengthArray_Check, lengthSquaredArray_Check], null)
		addFunctionToVariableEntries(mirror, gSetR)
		addFunctionToVariableEntries(mirrorJoin, gSetR)
		addFunctionsToVariableEntries([multiply2D_Check, multiply2DScalar_Check, multiply3D_Check, multiply3DScalar_Check], null)
		addFunctionsToVariableEntries([multiplyArray_Check, multiplyArrayScalar_Check], null)
		addFunctionsToVariableEntries([parabolaFromToQuantity, parabolaToQuantity], gSetR)
		addFunctionToVariableEntries(point, gSetRS)
		addFunctionToVariableEntries(pointsByID, gSetRS)
		addFunctionToVariableEntries(polar_Check, null)
		addFunctionToVariableEntries(rightByID, gSetRS)
		addFunctionsToVariableEntries([reverseSigns_Check, rotate2DAngle_Check, rotate2DVector_Check, getRotation2DVector_Check], null)
		addFunctionsToVariableEntries([setAttributesArrays, setAttributeByID, setAttributesRowTable, setAttributesTable], gSetRS)
		addFunctionsToVariableEntries([sideHypoteneuse_Check, sideHypoteneuseSquared_Check], null)
		addFunctionToVariableEntries(sineWaveXFromToCycles, null)
		addFunctionToVariableEntries(sineYXFromToCycles, null)
		addFunctionToVariableEntries(spiralBeforeFromTo, gSetR)
		addFunctionToVariableEntries(spiralCenterRadius, null)
		addFunctionToVariableEntries(spiralFromToAngle, gSetR)
		addFunctionToVariableEntries(spiralFromToRadius, gSetR)
		addFunctionToVariableEntries(spiralTo, gSetR)
		addFunctionToVariableEntries(spiralToAngle, gSetR)
		addFunctionToVariableEntries(spiralToRadius, gSetR)
		addFunctionsToVariableEntries([stepsFromQuantityIncrement, stepsQuantityIncrement], gSetR)
		addFunctionsToVariableEntries([stepFromToBetween, stepsFromToAlong, stepsFromToBetween, stepsFromToQuantity], gSetR)
		addFunctionsToVariableEntries([stepsToAlong, stepsToBetween, stepsToQuantity, stepToBetween], gSetR)
		addFunctionToVariableEntries(stringLength, gSetRS)
		addFunctionsToVariableEntries([subtract2D_Check, subtract3D_Check, subtractArray_Check], null)
		addFunctionToVariableEntries(topByID, gSetRS)
		addFunctionToVariableEntries(toward, null)
		addFunctionToVariableEntries(zigzag, null)
		addFunctionsToVariableEntries([zoomInterpolation, zoomInterpolation2D, zoomInterpolation3D], null)
		gVariableMapEntries.push(['Array', addVariableObjectToEntries(new Map(), Array)])
		gVariableMapEntries.push(['Date', addVariableObjectToEntries(new Map(), Date)])
		var mathMap = new Map()
		gVariableMapEntries.push(['Math', addVariableObjectToEntries(mathMap, Math)])
		mathMap.set('DegreesPerRadian', gDegreesPerRadian.toString())
		mathMap.set('DR', gDegreesPerRadian.toString())
		mathMap.set('RadiansPerDegree', gRadiansPerDegree.toString())
		mathMap.set('RD', gRadiansPerDegree.toString())
		mathMap.set('PI2', gDoublePi.toString())
		gVariableMapEntries.push(['Number', addVariableObjectToEntries(new Map(), Number)])
		gVariableMapEntries.push(['String', addVariableObjectToEntries(new Map(), String)])
	},
	name: 'var',
	processStatement: function(registry, statement) {
		var attributeMap = statement.attributeMap
		var variableMap = getVariableMapByStatement(statement.parent)
		for (var key of attributeMap.keys()) {
			if (key != 'id') {
				var variableString = attributeMap.get(key)
				if (isNaN(variableString)) {
					variableString = getString(getValueByEquation(registry, statement, variableString))
					attributeMap.set(key, variableString)
				}
				variableMap.set(key, variableString)
			}
		}
	}
}

var gView = {
	alterMesh: function(mesh, registry, statement) {
		if (mesh == null) {
			return
		}
		var view = new ViewMesh()
		view.id = statement.attributeMap.get('id')
		viewBroker.minimumHeight = Math.max(viewBroker.minimumHeight, 96)
		registry.views.push(view)
	},
	getPoints: function(points, registry, statement) {
		if (statement.tag != 'image') {
			return points
		}
		if (statement.attributeMap.has('href')) {
			var view = new ViewImage()
			view.filename = statement.attributeMap.get('href')
			view.id = statement.attributeMap.get('id')
			viewBroker.minimumHeight = Math.max(viewBroker.minimumHeight, 256)
			registry.views.push(view)
		}
		else {
			noticeByList(['No href for image in meta.', statement])
		}
		return points
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'view',
	processStatement: function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)
		if (workMeshes.length > 0) {
			for (var workMesh of workMeshes) {
				this.alterMesh(workMesh, registry, statement)
				analyzeOutputMesh(workMesh, registry, statement)
			}
			return
		}
		var workStatements = getWorkStatements(registry, statement)

		if (workStatements.length == 0) {
			noticeByList(['No workStatements could be found for view in alteration.', statement])
		}

		for (var workStatement of workStatements) {
			this.getPoints(undefined, registry, workStatement)
		}
	}
}

var gWindow = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'window',
	processStatement: function(registry, statement) {
		statement.tag = 'g'
		setMapIfMissing('skip2D', statement.attributeMap, 'true')
		getMatrix2D(registry, statement)
	}
}

var gMetaProcessors = [
	gAbstract, gCopy, gCopyMesh, gCopyPoints, gDelete, gGroup, gHelp, gMatrix2D, gMatrix3D, gPolygonAnalysis,
	gProcess, gRow, gSpreadsheet, gSTLInput, gSTL, gString, gTriangleAnalysis, gTSV, gTSVInput, gVar, gView, gWindow
]
