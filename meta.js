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

function addFunctionToMap(functionToAdd, optionSet, map) {
	var functionName = functionToAdd.name
	if (functionName.endsWith('_Check')) {
		functionName = functionName.slice(0, -6)
	}

	functionToAdd.optionSet = optionSet
	getValueDefault(map, gFunctionMap).set(functionName, functionToAdd)
}

function addFunctionsToMap(functionsToAdd, optionSet, map) {
	for (var functionToAdd of functionsToAdd) {
		addFunctionToMap(functionToAdd, optionSet, map)
	}
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
		copyKeysExcept(meshStatement.attributeMap, statement.attributeMap, gIDPointsTransformWorkSet)
		getUniqueID(idStart, registry, meshStatement)
		analyzeOutputMesh(getMeshCopy(mesh), registry, statement)
	}
	deleteKeysExcept(statement.attributeMap, gIDPointsTransformWorkSet)
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
		copyKeysExcept(tagStatement.attributeMap, statement.attributeMap, gIDPointsTransformWorkSet)
		getUniqueID(idStart, registry, tagStatement)
		setPointsExcept(getArraysCopy(pointsStatement.points), registry, tagStatement)
	}
	deleteKeysExcept(statement.attributeMap, gIDPointsTransformWorkSet)
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
	copyMissingKeysExcept(statement.attributeMap, workStatement.attributeMap, gIDSet)
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
	copyMissingKeysExcept(statement.attributeMap, workStatement.attributeMap, gAlterationDisplayIDTransformWorkSet)
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

function getAttributeString(registry) {
	var attributeValues = []
	for (var line of registry.lines) {
		var statement = getStatement(line)
		if (statement.attributeMap != undefined) {
			for (var value of statement.attributeMap.values()) {
				attributeValues.push(value)
			}
		}
	}

	return attributeValues.join(' ')
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

function getMapByVariableObject(variableObject) {
	var map = new Map()
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
		var project = undefined
		if (attributeMap.has('project')) {
			project = attributeMap.get('project')
			if (project != 'untitled') {
				titleStrings.push(project)
				registry.dataMap.set('project', project)
			}
		}
		if (attributeMap.has('id')) {
			var abstractID = attributeMap.get('id')
			if (abstractID != 'untitled' && abstractID != 'abstract' && abstractID != project) {
				titleStrings.push(abstractID)
				registry.dataMap.set('abstractID', abstractID)
			}
		}
		if (attributeMap.has('date')) {
			var date = attributeMap.get('date')
			titleStrings.push(date)
			registry.dataMap.set('date', date)
		}
		gTitle = titleStrings.join(' - ')
		document.title = gTitle + ' - Wordscape'
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
			if (workStatement == undefined) {
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
			copyKeysExcept(matrixAttributeMap, statement.attributeMap, gIDPointsTransformWorkSet)
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
		deleteKeysExcept(statement.attributeMap, gIDPointsTransformWorkSet)
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
			copyKeysExcept(matrixAttributeMap, statement.attributeMap, gIDPointsTransformWorkSet)
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
		deleteKeysExcept(statement.attributeMap, gIDPointsTransformWorkSet)
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
		copyMissingKeys(statement.attributeMap, getMeshAnalysis(workMesh, getPoint3DByStatement('normal', registry, statement)))
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
				copyKeysExcept(workStatement.attributeMap, statement.attributeMap, gIDPointsTransformWorkSet)
				processStatementsByTagMap(new Set(), registry, getDescendantsInsideFirst(workStatement), gTagCenterMap)
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
		copyMissingKeys(statement.attributeMap, getMeshAnalysis(workMesh, getPoint3DByStatement('normal', registry, statement)))
	}
}

var gTSV = {
	alterMesh: function(mesh, registry, statement) {
		var id = getOutputOrWorkOrID(statement.attributeMap)
		var date = getNullOrValue(registry.dataMap, 'date')
		addOutputArea(getTSVMeshString(date, id, mesh, getNullOrValue(registry.dataMap, 'project')), 'TSV - ' + id)
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
		addFunctionToMap(alongsFromToDistance, null)
		addFunctionToMap(arcBeforeFromTo, gSetR)
		addFunctionToMap(arcCenterRadius, null)
		addFunctionToMap(arcFromToAngle, gSetR)
		addFunctionToMap(arcFromToRadius, gSetR)
		addFunctionToMap(arcTo, gSetR)
		addFunctionToMap(arcToAngle, gSetR)
		addFunctionToMap(arcToRadius, gSetR)
		addFunctionToMap(arcWaveXFromToHeight, null)
		addFunctionToMap(arcYXFromToHeight, null)
		addFunctionToMap(attributeByIDKey, gSetRS)
		addFunctionToMap(border, gSetRS)
		addFunctionToMap(bracket, null)
		addFunctionToMap(ellipseFromToRadius, gSetR)
		addFunctionToMap(ellipseToRadius, gSetR)
		addFunctionToMap(floatByIDKey, gSetRS)
		addFunctionToMap(floatByKeyID, gSetRS)
		addFunctionToMap(insetsHeightAngle, null)
		addFunctionsToMap([intervalFromToBetween, intervalsFromQuantityIncrement, intervalsFromToAlong], null)
		addFunctionsToMap([intervalsFromToBetween, intervalsFromToIncrement, intervalsFromToQuantity], null)
		addFunctionToMap(joinPoints, gSetR)
		addFunctionToMap(mirror, gSetR)
		addFunctionToMap(mirrorJoin, gSetR)
		addFunctionsToMap([parabolaFromToQuantity, parabolaToQuantity], gSetR)
		addFunctionToMap(point, gSetRS)
		addFunctionToMap(pointsByID, gSetRS)
		addFunctionToMap(rightByID, gSetRS)
		addFunctionsToMap([setAttributesArrays, setAttributeByID, setAttributesRowTable, setAttributesTable], gSetRS)
		addFunctionToMap(sineWaveXFromToCycles, null)
		addFunctionToMap(sineYXFromToCycles, null)
		addFunctionToMap(spiralBeforeFromTo, gSetR)
		addFunctionToMap(spiralCenterRadius, null)
		addFunctionToMap(spiralFromToAngle, gSetR)
		addFunctionToMap(spiralFromToRadius, gSetR)
		addFunctionToMap(spiralTo, gSetR)
		addFunctionToMap(spiralToAngle, gSetR)
		addFunctionToMap(spiralToRadius, gSetR)
		addFunctionsToMap([stepsFromQuantityIncrement, stepsQuantityIncrement], gSetR)
		addFunctionsToMap([stepFromToBetween, stepsFromToAlong, stepsFromToBetween, stepsFromToQuantity], gSetR)
		addFunctionsToMap([stepsToAlong, stepsToBetween, stepsToQuantity, stepToBetween], gSetR)
		addFunctionToMap(stringLength, gSetRS)
		addFunctionToMap(topByID, gSetRS)
		addFunctionToMap(toward, null)
		addFunctionToMap(zigzag, null)
		addFunctionsToMap([zoomInterpolation, zoomInterpolation2D, zoomInterpolation3D], null)
		gFunctionMap.set('Array', getMapByVariableObject(Array))
		gFunctionMap.set('Date', getMapByVariableObject(Date))
		var mathMap = getMapByVariableObject(Math)
		gFunctionMap.set('Math', mathMap)
		mathMap.set('DegreesPerRadian', gDegreesPerRadian.toString())
		mathMap.set('DR', gDegreesPerRadian.toString())
		mathMap.set('RadiansPerDegree', gRadiansPerDegree.toString())
		mathMap.set('RD', gRadiansPerDegree.toString())
		mathMap.set('PI2', gDoublePi.toString())
		gFunctionMap.set('Number', getMapByVariableObject(Number))
		gFunctionMap.set('String', getMapByVariableObject(String))
		var vectorMap = getMapByVariableObject(Math)
		gFunctionMap.set('Vector', vectorMap)
		addFunctionsToMap([add2D_Check, add3D_Check, addArray_Check], null, vectorMap)
		addFunctionsToMap([additionInterpolation, additionInterpolation2D, additionInterpolation3D], null, vectorMap)
		addFunctionToMap(arrayAtIndex_Check, null, vectorMap)
		addFunctionsToMap([crossProduct_Check, crossProduct2D_Check], null, vectorMap)
		addFunctionsToMap([distance2D_Check, distanceSquared2D_Check, distance3D_Check, distanceSquared3D_Check], null, vectorMap)
		addFunctionsToMap([distanceArray_Check, distanceSquaredArray_Check], null, vectorMap)
		addFunctionsToMap([divide2D_Check, divide2DScalar_Check, divide3D_Check, divide3DScalar_Check], null, vectorMap)
		addFunctionsToMap([divideArray_Check, divideArrayScalar_Check], null, vectorMap)
		addFunctionsToMap([equal2D_Check, equal3D_Check, equalArray_Check], null, vectorMap)
		addFunctionsToMap([getAddition2D_Check, getAddition2Ds_Check, getAddition3D_Check, getAdditionArray_Check], null, vectorMap)
		addFunctionsToMap([getDivision2D_Check, getDivision2DScalar_Check], null, vectorMap)
		addFunctionsToMap([getDivision3D_Check, getDivision3DScalar_Check], null, vectorMap)
		addFunctionsToMap([getDivisionArray_Check, getDivisionArrayScalar_Check], null, vectorMap)
		addFunctionsToMap([getMultiplication2D_Check, getMultiplication2DScalar_Check], null, vectorMap)
		addFunctionsToMap([getMultiplication3D_Check, getMultiplication3DScalar_Check], null, vectorMap)
		addFunctionsToMap([getMultiplicationArray_Check, getMultiplicationArrayScalar_Check], null, vectorMap)
		addFunctionsToMap([getSubtraction2D_Check, getSubtraction3D_Check, getSubtractionArray_Check], null, vectorMap)
		addFunctionsToMap([length2D_Check, lengthSquared2D_Check, length3D_Check], null, vectorMap)
		addFunctionsToMap([lengthSquared3D_Check, lengthArray_Check, lengthSquaredArray_Check], null, vectorMap)
		addFunctionsToMap([multiply2D_Check, multiply2DScalar_Check, multiply3D_Check, multiply3DScalar_Check], null, vectorMap)
		addFunctionsToMap([multiplyArray_Check, multiplyArrayScalar_Check], null, vectorMap)
		addFunctionsToMap([oppositeHypoteneuseAdjacent_Check, oppositeHypoteneuseAdjacentSquared_Check], null, vectorMap)
		addFunctionToMap(polar_Check, null, vectorMap)
		addFunctionsToMap([reverseSigns_Check, rotate2DAngle_Check, rotate2DVector_Check, getRotation2DVector_Check], null, vectorMap)
		addFunctionsToMap([getRotation2DX_Check, getRotation2DY_Check], null, vectorMap)
		addFunctionsToMap([subtract2D_Check, subtract3D_Check, subtractArray_Check], null, vectorMap)
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

var gVarAnalysis = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'varAnalysis',
	processStatement: function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)
		if (workStatements.length == 0) {
			var parent = statement
			for (var whileCount = 0; whileCount < gLengthLimit; whileCount++) {
				if (parent.parent == undefined) {
					break
				}
				else {
					parent = parent.parent
				}
			}
			workStatements = [parent]
		}

		var descendantSet = new Set()
		for (var workStatement of workStatements) {
			addElementsToSet(descendantSet, getDescendantsInsideFirst(workStatement))
		}

		var variableMap = new Map()
		for (var descendant of descendantSet) {
			if (descendant.variableMap != undefined) {
				for (var key of descendant.variableMap.keys()) {
					if (!key.startsWith('_')) {
						variableMap.set(key, descendant.variableMap.get(key))
					}
				}
			}
		}

		if (getBooleanByDefault(false, 'all', registry, statement, this.name)) {
			var allVariables = []
			for (var entry of variableMap.entries()) {
				allVariables.push(entry)
			}
			allVariables.sort(compareStringZeroAscending)
			statement.attributeMap.set('allVariables', allVariables.join(' ').toString())
		}

		if (getBooleanByDefault(true, 'unused', registry, statement, this.name)) {
			var attributeString = getAttributeString(registry)
			var unusedVariables = []
			for (var key of variableMap.keys()) {
				if (attributeString.indexOf(key) == -1) {
					unusedVariables.push(key)
				}
			}
			statement.attributeMap.set('unusedVariables', unusedVariables.toString().replace(/,/g, ' '))
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
		registry.views.push(view)
	},
	getPoints: function(points, registry, statement) {
		var id = statement.attributeMap.get('id')
		if (statement.tag == 'image') {
			if (statement.attributeMap.has('href')) {
				var view = new ViewPoints()
				view.filename = statement.attributeMap.get('href')
				view.id = id
				registry.views.push(view)
			}
			else {
				noticeByList(['No href for image in meta.', statement])
			}
			return points
		}

		if (getIsEmpty(points)) {
			noticeByList(['No points for view in meta.', statement])
			return points
		}

		var view = new ViewPoints()
		view.id = id
		view.lineStatement = getStatement(registry.lines[statement.lineIndex])
		var parent = statement
		var parents = []
		for (var whileCount = 0; whileCount < gRecursionLimit; whileCount++) {
			parents.push(parent)
			parent = parent.parent
			if (parent == undefined) {
				break
			}
		}

		view.lineStatement.variableMap = new Map()
		parents.reverse()
		for (var parent of parents) {
			if (parent.variableMap != undefined) {
				addMapToMap(view.lineStatement.variableMap, parent.variableMap)
			}
		}

		registry.views.push(view)
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
	gProcess, gRow, gSpreadsheet, gSTLInput, gSTL, gString, gTriangleAnalysis, gTSV, gTSVInput, gVar, gVarAnalysis, gView, gWindow
]
