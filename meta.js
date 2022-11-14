//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gAlterationsDisplay = ['alterations', 'display']
const gAlterationsSet = new Set(gAlterationsDisplay)
const gLowerCharacterSet = new Set('abcdefghijklmnopqrstuvwxyz_'.split(''))
const gIDTransformWork = ['id', 'transform', 'transform3D', 'work']
const gIDPointsTransformWorkSet = new Set(gIDTransformWork.concat(['points', 'pointsHD']))
const gAlterationsDisplayIDTransformWorkSet = new Set(gAlterationsDisplay.concat(gIDTransformWork))
const gSetR = new Set(['r'])
const gSetS = new Set(['s'])
const gSetRS = new Set(['r', 's'])

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

function addStatementRecursively(depth, parent, registry, workStatement) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 1,000 in addStatementRecursively reached, no further statements will be added.'
		warningByList([warningText, parent, gRecursionLimit])
		return
	}
	var statement = getStatementByParentTag(new Map(), workStatement.nestingIncrement, parent, workStatement.tag)
	getUniqueID(parent.attributeMap.get('id') + '_' + workStatement.attributeMap.get('id'), registry, statement)
	copyMissingKeysExcept(gAlterationsDisplayIDTransformWorkSet, workStatement.attributeMap, statement.attributeMap)
	createMeshCopy(registry, statement, workStatement)
	var work2DMatrix = getMatrix2D(registry, workStatement)
	if (work2DMatrix != null) {
		statement.attributeMap.set('transform', 'matrix(' + work2DMatrix.toString() + ')')
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
	var mesh = getWorkMeshByID(statement.attributeMap.get('id'), registry)
	if (mesh != null) {
		alterMeshExcept(mesh, registry, statement)
		return
	}
	var points = getPointsHD(registry, statement)
	if (points != null) {
		setPointsHD(getPointsExcept(points, registry, statement), statement)
	}
}

function copyAlterRecursively(depth, registry, rootStatement, statement) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 1,000 in copyAlterRecursively reached, no further statements will be added.'
		warningByList([warningText, statement, gRecursionLimit])
		return
	}
	depth += 1
	for (var child of statement.children) {
		copyAlterRecursively(depth, registry, rootStatement, child)
	}
	copyKeysExcept(gIDPointsTransformWorkSet, rootStatement.attributeMap, statement.attributeMap)
	var mesh = getWorkMeshByID(statement.attributeMap.get('id'), registry)
	if (mesh != null) {
		transform3DPoints(getChainMatrix3D(registry, statement), mesh.points)
	}
	alterStatementPoints(registry, statement)
}

function copyStatementRecursively(registry, statement, workStatement) {
	copyMissingKeysExcept(gAlterationsDisplayIDTransformWorkSet, workStatement.attributeMap, statement.attributeMap)
	createMeshCopy(registry, statement, workStatement)
	var work2DMatrix = getChainSkipMatrix2D(registry, workStatement)
	if (work2DMatrix != null) {
		var statement2DMatrix = getMatrix2D(registry, statement)
		if (statement2DMatrix != null) {
			work2DMatrix = getMultiplied2DMatrix(statement2DMatrix, work2DMatrix)
		}
		statement.attributeMap.set('transform', 'matrix(' + work2DMatrix.toString() + ')')
	}
	for (var child of workStatement.children) {
		addStatementRecursively(0, statement, registry, child)
	}
}

function createMeshCopy(registry, statement, workStatement) {
	var mesh = getWorkMeshByID(workStatement.attributeMap.get('id'), registry)
	if (mesh != null) {
		registry.meshMap.set(statement.attributeMap.get('id'), getMeshCopy(mesh))
	}
}

function getDistanceSquaredToStatement(location, registry, statement) {
	var points = getPointsHD(registry, statement)
	var workMesh = getWorkMeshByID(statement.attributeMap.get('id'), registry)
	if (workMesh != null) {
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
	statement = getStatementByID(registry, statement, id)
	return getGroupBoundingBox(statement, registry, statement)
}

function getMatrix2DsBySuffix(attributeMap, registry, statement, suffix) {
	var matrix2Ds = getPointsByKey(getSuffixedString('matrix2Ds', suffix), registry, statement)
	if (matrix2Ds == null) {
		matrix2Ds = []
	}
	var suffixedPlanes = getSuffixedString('planes', suffix)
	var planes = getPointsByKey(suffixedPlanes, registry, statement)
	if (planes != null) {
		for (var plane of planes) {
			matrix2Ds.push(getMatrix2DByPlane(plane))
		}
		attributeMap.set(suffixedPlanes, planes.join(' '))
	}
	var suffixedPolars = getSuffixedString('polars', suffix)
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
		if (workStatement != null) {
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

function getMatrix3DsByChildren(children, registry) {
	var matrix3DsByChildren = []
	for (var child of children) {
		matrix3Ds = getPointsByTag('matrix3Ds', registry, child, 'matrix3D')
		matrix3DsByChildren = getPushArray(matrix3DsByChildren, matrix3Ds)
	}
	return matrix3DsByChildren
}

function getMatrix3DsBySuffix(attributeMap, registry, statement, suffix) {
	var matrix3Ds = getPointsByKey(getSuffixedString('matrix3Ds', suffix), registry, statement)
	if (matrix3Ds == null) {
		matrix3Ds = []
	}
	var suffixedPlanes = getSuffixedString('planes', suffix)
	var planes = getPointsByKey(suffixedPlanes, registry, statement)
	if (planes != null) {
		for (var plane of planes) {
			matrix3Ds.push(getMatrix3DByTranslate(plane))
		}
		attributeMap.set(suffixedPlanes, planes.join(' '))
	}
	var suffixedPolars = getSuffixedString('polars', suffix)
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
		if (workStatement != null) {
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

function getOutputOrWorkOrID(attributeMap) {
	if (attributeMap.has('output')) {
		return attributeMap.get('output')
	}
	if (attributeMap.has('work')) {
		return attributeMap.get('work')
	}
	return attributeMap.get('id')
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
			if (statement.parent == null) {
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
		if (statement.parent == null) {
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
	if (getWorkMeshByID(statement.attributeMap.get('id'), registry) == null) {
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
	var workMesh = getWorkMeshByID(work, registry)
	if (workMesh == null) {
		return null
	}
	if (workMesh[propertyName] == undefined) {
		return null
	}
	return workMesh[propertyName].toString()
}

var gAbstract = {
	initialize: function() {
		gTagBeginMap.set(this.name, this)
	},
	name: 'abstract',
	processStatement: function(registry, statement) {
		statement.tag = 'g'
		var attributeMap = statement.attributeMap
		setMapIfMissing('skip2D', attributeMap, 'true')
		setMapIfMissing('skip3D', attributeMap, 'true')
		var flipY = getFloatByStatement('flipY', registry, statement)
		if (flipY != null) {
			scaleString = 'scale(' + flipY + ',' + (-flipY) + ')'
			attributeMap.set('transform', scaleString)
		}
		var styleMap = new Map([
			['fill', 'none'],
			['stroke', 'rgb(0,0,0)'],
			['stroke-width', '1']])
		if (attributeMap.has('style')) {
			styles = attributeMap.get('style').replace(/ /g, '').split(';')
			for (var style of styles) {
				var entry = style.split(':')
				styleMap.set(entry[0], entry[1])
			}
		}
		styles = []
		for (var entry of styleMap) {
			styles.push(entry[0] + ':' + entry[1])
		}
		attributeMap.set('style', styles.join(';'))
		titleStrings = []
		gProject = null
		if (attributeMap.has('project')) {
			gProject = attributeMap.get('project')
			if (gProject != 'untitled') {
				titleStrings.push(gProject)
				registry.storageMap.set('project', gProject)
			}
		}
		gAbstractID = null
		if (attributeMap.has('id')) {
			gAbstractID = attributeMap.get('id')
			if (gAbstractID != 'untitled' && gAbstractID != 'abstract' && gAbstractID != gProject) {
				titleStrings.push(gAbstractID)
				registry.storageMap.set('abstractID', gAbstractID)
			}
		}
		gDate = null
		if (attributeMap.has('date')) {
			gDate = attributeMap.get('date')
			titleStrings.push(gDate)
			registry.storageMap.set('date', gDate)
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
			copyAlterRecursively(0, registry, statement, statement)
			return
		}
		var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
		var matrix3Ds = getMatrix3DsByChildren(statement.children, registry)
		if (getIsEmpty(matrix2Ds) && getIsEmpty(matrix3Ds)) {
			noticeByList(['No matrix2Ds or matrix3Ds in gCopy', statement])
			return
		}
		statement.tag = 'g'
		for (var matrix2D of matrix2Ds) {
			var matrixStatement = getStatementByParentTag(new Map(), workStatement.nestingIncrement, statement, workStatement.tag)
			getUniqueID(statement.attributeMap.get('id') + '_' + workStatement.attributeMap.get('id'), registry, matrixStatement)
			matrixStatement.attributeMap.set('transform', 'matrix(' + matrix2D.toString() + ')')
			copyStatementRecursively(registry, matrixStatement, workStatement)
			copyAlterRecursively(0, registry, statement, matrixStatement)
		}
		for (var matrix3D of matrix3Ds) {
			var matrixStatement = getStatementByParentTag(new Map(), workStatement.nestingIncrement, statement, workStatement.tag)
			getUniqueID(statement.attributeMap.get('id') + '_' + workStatement.attributeMap.get('id'), registry, matrixStatement)
			matrixStatement.attributeMap.set('transform3D', 'matrix(' + matrix3D.toString() + ')')
			copyStatementRecursively(registry, matrixStatement, workStatement)
			copyAlterRecursively(0, registry, statement, matrixStatement)
		}
	}
}

var gCSV = {
	alterMesh: function(mesh, registry, statement) {
		var id = getOutputOrWorkOrID(statement.attributeMap)
		var date = getNullOrValue('date', registry.storageMap)
		addOutputArea(getCSVMeshString(date, id, mesh, getNullOrValue('project', registry.storageMap)), 'CSV - ' + id)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'csv',
	processStatement: function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			noticeByList(['No workMesh could be found for csv in meta.', statement])
		}
		else {
			alterMeshExcept(workMesh, registry, statement)
			this.alterMesh(workMesh, registry, statement)
		}
	}
}

var gDelete = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'delete',
	processStatement: function(registry, statement) {
		var workStatements = getWorkStatements(registry, statement)
		for (var workStatement of workStatements) {
			deleteStatement(workStatement)
		}
		deleteStatement(statement)
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
		attributeMap.set('matrix2Ds', matrix2Ds.join(' '))

		//deprecated23
		attributeMap.set('transform2Ds', matrix2Ds.join(' '))
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
					for (var matrix3D of matrix3Ds) {overlap
						newMatrix3Ds[count] = getMultiplied3DMatrix(depthMatrix3D, matrix3D)
						count++
					}
				}
				matrix3Ds = newMatrix3Ds
			}
		}
		attributeMap.set('matrix3Ds', matrix3Ds.join(' '))
	}
}

var gPolygonAnalysis = {
	alterMesh: function(mesh, registry, statement) {
		if (mesh == null) {
			return
		}
		var normal = get3DPointByStatement('normal', registry, statement)
		var analysisStatement = getStatementByParentTag(getMeshAnalysis(mesh, normal), 0, statement, 'polygonAnalysis')
		analysisStatement.attributeMap.set('id', statement.attributeMap.get('id') + '_polygonAnalysis')
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'polygonAnalysis',
	processStatement: function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			noticeByList(['No workMesh could be found for polygonAnalysis in meta.', statement])
		}
		else {
			statement.attributeMap = getMeshAnalysis(workMesh, get3DPointByStatement('normal', registry, statement))
		}
	}
}

var gRow = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'row',
	processStatement: function(registry, statement) {
		convertToGroup(statement)
		if (!statement.attributeMap.has('cells')) {
			return
		}
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
						copyMissingKeysExcept(gAlterationsSet, workStatement.attributeMap, child.attributeMap)
						copyStatementRecursively(registry, child, workStatement)
						copyAlterRecursively(0, registry, statement, child)
					}
				}
			}
		}
	}
}

var gSTLInput = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'stlInput',
	processStatement: function(registry, statement) {
		var stlInputString = document.getElementById('stlInputID').value
		var id = statement.attributeMap.get('id')
		var mesh = getMeshBySTL(id, stlInputString)
		if (mesh != null) {
			analyzeOutputMesh(mesh, registry, statement)
		}
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
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			noticeByList(['No workMesh could be found for stl in meta.', statement])
		}
		else {
			alterMeshExcept(workMesh, registry, statement)
			this.alterMesh(workMesh, registry, statement)
		}
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

var gTable = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'table',
	processStatement: function(registry, statement) {
		statement.tag = 'g'
		var step = getFloatsByDefault([10.0], 'step', registry, statement, this.name)
		if (step.length == 1) {
			step.push(step[0])
		}
		var add3DTransform = getBooleanByDefault(false, '3D', registry, statement, this.name)
		var translate = [0.0, 0.0]
		for (var child of statement.children) {
			if (child.nestingIncrement == 1) {
				for (var grandchild of child.children) {
					if (grandchild.nestingIncrement > -1) {
						var attributeMap = grandchild.attributeMap
						var translateString = 'translate(' + translate.toString() + ')'
						var totalString = translateString
						if (attributeMap.has('transform')) {
							totalString += ',' + attributeMap.get('transform')
						}
						attributeMap.set('transform', totalString)
						if (add3DTransform) {
							totalString = translateString
							if (attributeMap.has('transform3D')) {
								totalString += ',' + attributeMap.get('transform3D')
							}
							attributeMap.set('transform3D', totalString)
						}
						translate[0] += step[0]
					}
				}
			}
			translate[0] = 0.0
			translate[1] += step[1]
		}
	}
}

var gTriangleAnalysis = {
	alterMesh: function(mesh, registry, statement) {
		var normal = get3DPointByStatement('normal', registry, statement)
		var analysisStatement = getStatementByParentTag(getMeshAnalysis(getTriangleMesh(mesh), normal), 0, statement, 'triangleAnalysis')
		analysisStatement.attributeMap.set('id', statement.attributeMap.get('id') + '_triangleAnalysis')
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'triangleAnalysis',
	processStatement: function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			noticeByList(['No workMesh could be found for polygonAnalysis in meta.', statement])
		}
		else {
			statement.attributeMap = getMeshAnalysis(getTriangleMesh(workMesh), get3DPointByStatement('normal', registry, statement))
		}
	}
}

/*
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
		addFunctionToVariableEntries(fillet, gSetR)
		addFunctionToVariableEntries(filletPoint, gSetR)
		addFunctionToVariableEntries(filletTaggedPoints, gSetR)
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
		addFunctionToVariableEntries(intervalsFromQuantityIncrement, null)
		addFunctionToVariableEntries(intervalsFromToAlong, null)
		addFunctionToVariableEntries(intervalsFromToIncrement, null)
		addFunctionToVariableEntries(joinPoints, gSetR)
		addFunctionsToVariableEntries([length2D_Check, lengthSquared2D_Check, length3D_Check], null)
		addFunctionsToVariableEntries([lengthSquared3D_Check, lengthArray_Check, lengthSquaredArray_Check], null)
		addFunctionToVariableEntries(mirror, gSetR)
		addFunctionToVariableEntries(mirrorJoin, gSetR)
		addFunctionsToVariableEntries([multiply2D_Check, multiply2DScalar_Check, multiply3D_Check, multiply3DScalar_Check], null)
		addFunctionsToVariableEntries([multiplyArray_Check, multiplyArrayScalar_Check], null)
		addFunctionToVariableEntries(point, gSetRS)
		addFunctionToVariableEntries(pointsByID, gSetRS)
		addFunctionToVariableEntries(polar_Check, null)
		addFunctionToVariableEntries(rightByID, gSetRS)
		addFunctionsToVariableEntries([rotate2DVector_Check, getRotation2DVector_Check], null)
		addFunctionToVariableEntries(setAttributeByID, gSetRS)
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
		addFunctionToVariableEntries(stepsFromQuantityIncrement, gSetR)
		addFunctionToVariableEntries(stepsQuantityIncrement, gSetR)
		addFunctionToVariableEntries(stepsFromToAlong, gSetR)
		addFunctionToVariableEntries(stepsFromToQuantity, gSetR)
		addFunctionToVariableEntries(stepsToAlong, gSetR)
		addFunctionToVariableEntries(stepsToQuantity, gSetR)
		addFunctionToVariableEntries(stringLength, gSetRS)
		addFunctionsToVariableEntries([subtract2D_Check, subtract3D_Check, subtractArray_Check], null)
		addFunctionToVariableEntries(topByID, gSetRS)
		addFunctionToVariableEntries(toward, null)
		addFunctionToVariableEntries(zigzag, null)
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
		meshViewer.addMesh(statement.attributeMap.get('id'), null)
	},
	getPoints: function(points, registry, statement) {
		if (statement.tag != 'image') {
			return points
		}
		if (statement.attributeMap.has('href')) {
			meshViewer.addImage(statement.attributeMap.get('href'), statement.attributeMap.get('id'))
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
		var workStatement = getWorkStatement(registry, statement)
		if (workStatement != null) {
			this.alterMesh(null, registry, workStatement)
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
	gAbstract,
	gCopy,
	gCSV,
	gDelete,
	gGroup,
	gMatrix2D,
	gMatrix3D,
	gPolygonAnalysis,
	gRow,
	gSTLInput,
	gSTL,
	gString,
	gTable,
	gTriangleAnalysis,
//	gURL,
	gVar,
	gView,
	gWindow]
