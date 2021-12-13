//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gIDPointsWorkSet = new Set(['id', 'points', 'work'])
const gLowerCharacterSet = new Set('abcdefghijklmnopqrstuvwxyz_'.split(''))
const gSetR = new Set(['r'])
const gSetS = new Set(['s'])
const gSetRS = new Set(['r', 's'])

function addCSVToMeshArea(id, mesh, registry) {
	addToMeshArea(getCSVMeshString(getNullOrValue('date', registry.storageMap), id, mesh, getNullOrValue('project', registry.storageMap)))
}

function addFunctionToVariableEntries(functionToAdd, optionSet) {
	addFunctionToEntriesByName(functionToAdd, gVariableMapEntries, functionToAdd.name, optionSet)
}

function addFunctionToEntriesByName(functionToAdd, mapEntries, name, optionSet) {
	functionToAdd.optionSet = optionSet
	mapEntries.push([name, functionToAdd])
}

function addSTLToMeshArea(id, mesh) {
	addToMeshArea(getSTLMeshString(id, mesh))
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

function alterChildrenRecursively(children, depth, registry, rootStatement) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 1,000 in alterChildrenRecursively reached, no further statements will be processed.'
		warningByList([warningText, children, gRecursionLimit])
		return
	}
	if (getIsEmpty(children)) {
		return
	}
	depth += 1
	for (var child of children) {
		alterChildrenRecursively(child.children, depth, registry, rootStatement)
		var originalMap = new Map(child.attributeMap.entries())
		copyKeysExcept(gIDPointsWorkSet, rootStatement.attributeMap, child.attributeMap)
		alterStatementPoints(registry, child)
		var originalPoints = null
		if (child.attributeMap.has('points')) {
			originalPoints = child.attributeMap.get('points')
		}
		child.attributeMap = originalMap
		if (originalPoints != null) {
			child.attributeMap.set('points', originalPoints)
		}
	}
}

function alterStatementPoints(registry, statement) {
	var id = statement.attributeMap.get('id')
	if (registry.objectMap.has(id)) {
		var meshGenerator = registry.objectMap.get(id)
		if (meshGenerator != null) {
			var mesh = meshGenerator.getMesh()
			if (mesh != null) {
				alterMeshExcept(mesh, registry, statement, statement.tag)
			}
		}
		return
	}
	var points = getPointsByKey('points', registry, statement)
	if (points != null) {
		statement.attributeMap.set('points', getPointsExcept(points, registry, statement, statement.tag).join(' '))
	}
}

function arcWaveY(x, begin, end, height, phase, along) {
	var x = getValueByDefault(0.0, x)
	var begin = getValueByDefault(-2.0, begin)
	var end = getValueByDefault(0.0, end)
	var height = getValueByDefault(1.0, height)
	var phase = getValueByDefault(0.0, phase)
	var along = getValueByDefault(0.0, along)
	var chordLength = end - begin
	var radius = 0.5 * height + 0.125 * chordLength * chordLength / height
	var wavelength = 4.0 * radius
	var wavePortion = getPositiveModulo((x + phase / 360.0 * wavelength - (0.5 * (begin + end) - radius)) / wavelength)
	var y = radius - height * along
	if (wavePortion < 0.5) {
		var waveAway = wavePortion - 0.25
		var squareMultiplier = 1.0 - 16.0 * waveAway * waveAway
		if (squareMultiplier > 0.0) {
			return y - radius * Math.sqrt(squareMultiplier)
		}
	}
	else {
		var waveAway = wavePortion - 0.75
		var squareMultiplier = 1.0 - 16.0 * waveAway * waveAway
		if (squareMultiplier > 0.0) {
			return y + radius * Math.sqrt(squareMultiplier)
		}
	}
	return y
}

function attributeByID(registry, statement, key, id) {
	if (id != undefined) {
		if (registry.idMap.has(id)) {
			statement = registry.idMap.get(id)
		}
	}
	return statement.attributeMap.get(key)
}

function border(registry, statement, id) {
	return 10.0
}

function completeGroupStatementIfNecessary(statement) {
	statement.tag = 'g'
	if (statement.nestingIncrement < 1) {
		statement.nestingIncrement = 1
		addClosingStatement(statement)
	}
}

function copyStatement(parent, registry, statement, statementTransform2D, transform2Ds, workID, workStatement) {
	if (registry.objectMap.has(workID)) {
		var workGenerator = registry.objectMap.get(workID)
		if (workGenerator != null) {
			var workMesh = workGenerator.getMesh()
			if (workMesh != null) {
				statement = getStatementByWorkStatement(parent, registry, statement, 'mesh', workStatement)
				if (transform2Ds == null) {
					transformRegisterMesh(registry, statement, statementTransform2D, workMesh)
				}
				else {
					var idStart = getGroupIDStart(statement, workStatement)
					for (var transformIndex = 0; transformIndex < transform2Ds.length; transformIndex++) {
						var meshCopy = getMeshCopy(workMesh)
						transform2DPoints(meshCopy.points, transform2Ds[transformIndex])
						var id = idStart + transformIndex.toString()
						var transformStatement = getStatementByParent(id, workStatement.tag, registry, statement)
						transformRegisterMesh(registry, transformStatement, statementTransform2D, workMesh)
					}
				}
			}
		}
		return
	}
	var points = null
	if (statement == null) {
		points = getPointsByKey('points', registry, workStatement)
	}
	else {
		points = getPointsIncludingWork(registry, statement)
	}
	if (points == null) {
		return
	}
	statement = getStatementByWorkStatement(parent, registry, statement, workStatement.tag, workStatement)
	if (transform2Ds == null) {
		transformSetStatement(points, statement, statementTransform2D)
		return
	}
	var idStart = getGroupIDStart(statement, workStatement)
	for (var transformIndex = 0; transformIndex < transform2Ds.length; transformIndex++) {
		var pointsCopy = getArraysCopy(points)
		transform2DPoints(pointsCopy, transform2Ds[transformIndex])
		var id = idStart + transformIndex.toString()
		var transformStatement = getStatementByParent(id, workStatement.tag, registry, statement)
		transformSetStatement(pointsCopy, transformStatement, statementTransform2D)
	}
}

function copyStatementRecursively(depth, parent, registry, statement, statementTransform2D, transform2Ds, workID) {
	if (!registry.idMap.has(workID)) {
		return
	}
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 1,000 in copyStatementRecursively reached, no further statements will be copied.'
		warningByList([warningText, statement, gRecursionLimit])
		return
	}
	var workStatement = registry.idMap.get(workID)
	if (workStatement.tag == 'g') {
		depth += 1
		if (statement == null) {
			var id = parent.attributeMap.get('id') + '_' + workStatement.attributeMap.get('id')
			statement = getStatementByParent(id, 'g', registry, parent)
		}
		completeGroupStatementIfNecessary(statement)
		for (var child of workStatement.children) {
			var childID = child.attributeMap.get('id')
			copyStatementRecursively(depth, statement, registry, null, statementTransform2D, transform2Ds, childID)
		}
		return
	}
	copyStatement(parent, registry, statement, statementTransform2D, transform2Ds, workID, workStatement)
}

function getGroupBoundingBoxByArguments(id, registry, statement) {
	if (id != undefined) {
		if (registry.idMap.has(id)) {
			statement = registry.idMap.get(id)
		}
	}
	return getGroupBoundingBox(statement, registry, statement)
}

function getGroupIDStart(statement, workStatement) {
	completeGroupStatementIfNecessary(statement)
	return statement.attributeMap.get('id') + '_' + workStatement.tag + '_'
}

function getIntervalsIncludingEnd(begin, end, increment) {//deprecated
	var difference = end - begin
	var numberUntilEnd = Math.floor((difference + gClose) / increment)
	var intervals = new Array(1 + numberUntilEnd)
	var dividedIncrement = difference / numberUntilEnd
	var total = 0.0
	for (var intervalIndex = 0; intervalIndex < numberUntilEnd; intervalIndex++) {
		intervals[intervalIndex] = total
		total += dividedIncrement
	}
	intervals[intervals.length - 1] = end
	return intervals
}

function getPolar(length, inputAngle) {
	var angle = 0.0
	if (inputAngle != undefined) {
		angle = inputAngle * gRadiansPerDegree
	}
	return getXYPolarByRadius(angle, length)
}

function getPoint(registry, statement, name, x, y, z) {
	var pointArgumentsLength = arguments.length - 3
	var point = new Array(pointArgumentsLength)
	for (var argumentIndex = 0; argumentIndex < pointArgumentsLength; argumentIndex++) {
		point[argumentIndex] = arguments[argumentIndex + 3]
	}
	var variableMap = getVariableMapByParent(statement.parent)
	if (variableMap.has('@floatLists')) {
		var oldFloats = variableMap.get('@floatLists')
		for (var oldIndex = 0; oldIndex < Math.min(point.length, oldFloats.length); oldIndex++) {
			if (point[oldIndex] == undefined) {
				point[oldIndex] = oldFloats[oldIndex]
			}
		}
	}
	variableMap.set(name, point.toString())
	return point
}

function getPointsByID(registry, statement, id) {
	if (id != undefined) {
		if (registry.idMap.has(id)) {
			statement = registry.idMap.get(id)
		}
	}
	return getPointsByKey('points', registry, statement)
}

function getStatementByWorkStatement(parent, registry, statement, tag, workStatement) {
	if (statement == null) {
		var id = parent.attributeMap.get('id') + '_' + workStatement.attributeMap.get('id')
		return getStatementByParent(id, tag, registry, parent)
	}
	statement.tag = workStatement.tag
	return statement
}

function getStringLength(word) {
	return word.length
}

function intervals(begin, end, increment, includeEnd) {
	var difference = end - begin
	var numberUntilEnd = Math.floor((difference + gClose) / increment)
	if (includeEnd == undefined) {
		includeEnd = true
	}
	var intervals = new Array((includeEnd == true) + numberUntilEnd)
	var dividedIncrement = difference / numberUntilEnd
	var total = 0.0
	for (var intervalIndex = 0; intervalIndex < numberUntilEnd; intervalIndex++) {
		intervals[intervalIndex] = total
		total += dividedIncrement
	}
	if (includeEnd) {
		intervals[intervals.length - 1] = end
	}
	return intervals
}

function rightByID(registry, statement, id) {
	return getGroupBoundingBoxByArguments(id, registry, statement)[1][0]
}

function sineWave(amplitude, begin, end, numberOfCycles, phase, along, numberOfSegments) {
	var amplitude = getValueByDefault(1.0, amplitude)
	var begin = getValueByDefault(-2.0, begin)
	var end = getValueByDefault(0.0, end)
	var numberOfCycles = getValueByDefault(1.0, numberOfCycles)
	var phase = getValueByDefault(0.0, phase) * gRadiansPerDegree
	var along = getValueByDefault(0.0, along)
	var numberOfSegments = getValueByDefault(24, numberOfSegments)
	var sinPoints = new Array(numberOfCycles * numberOfSegments + 1)
	var wavelength = Math.abs(end - begin) / numberOfCycles
	var oneOverWavelengthSegments = wavelength / numberOfSegments
	for (var pointIndex = 0; pointIndex < sinPoints.length; pointIndex++) {
		var x = pointIndex * oneOverWavelengthSegments + begin
		sinPoints[pointIndex] = [x, amplitude * Math.sin(x * gDoublePi / wavelength + phase)]
	}
	return sinPoints
}

function sineWaveY(x, begin, end, numberOfCycles, phase, along) {
	var x = getValueByDefault(0.0, x)
	var begin = getValueByDefault(-2.0, begin)
	var end = getValueByDefault(0.0, end)
	var numberOfCycles = getValueByDefault(1.0, numberOfCycles)
	var phase = getValueByDefault(0.0, phase) * gRadiansPerDegree
	var along = getValueByDefault(0.0, along)
	var wavelength = Math.abs(end - begin) / numberOfCycles
	return Math.sin((x + begin) * gDoublePi / wavelength + phase)
}

function topByID(registry, statement, id) {
	return getGroupBoundingBoxByArguments(id, registry, statement)[1][1]
}

function transformRegisterMesh(registry, statement, statementTransform2D, workMesh) {
	var meshCopy = getMeshCopy(workMesh)
	transform2DPoints(meshCopy.points, statementTransform2D)
	var attributeMap = statement.attributeMap
	registry.objectMap.set(attributeMap.get('id'), new Mesh(meshCopy))
}

function transformSetStatement(points, statement, transform2D) {
	if (transform2D != null) {
		transform2DPoints(points, transform2D)
	}
	statement.attributeMap.set('points', points.join(' '))
}

function workMesh(registry, statement, propertyName) {
	var attributeMap = statement.attributeMap
	if (!attributeMap.has('work')) {
		return null
	}
	var work = attributeMap.get('work')
	if (work.startsWith("'") || work.startsWith("'")) {
		work = work.slice(1)
	}
	if (work.endsWith("'") || work.endsWith("'")) {
		work = work.slice(0, work.length - 1)
	}
	var workGenerator = registry.objectMap.get(work)
	if (workGenerator == null) {
		return null
	}
	var workMesh = workGenerator.getMesh()
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
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
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
		if (attributeMap.has('project')) {
			var project = attributeMap.get('project')
			titleStrings.push(project)
			registry.storageMap.set('project', project)
		}
		if (attributeMap.has('date')) {
			var date = attributeMap.get('date')
			titleStrings.push(date)
			registry.storageMap.set('date', date)
		}
		titleStrings.push('Wordscape')
		document.title = titleStrings.join(' - ')
	}
}

var gCopy = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'copy',
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		if (!attributeMap.has('work')) {
			return
		}
		var transform2Ds = getTransform2DsByChildren(statement.children, registry)
		var statementTransform2D = get2DMatrix(registry, statement)
		if (statementTransform2D != null) {
			statement.attributeMap.delete('transform')
		}
		copyStatementRecursively(0, statement, registry, statement, statementTransform2D, transform2Ds, attributeMap.get('work'))
		alterStatementPoints(registry, statement, statement)
		alterChildrenRecursively(statement.children, 0, registry, statement)
	}
}

var gCSV = {
	alterMesh: function(mesh, registry, statement) {
		addCSVToMeshArea(statement.attributeMap.get('id'), mesh, registry)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'csv',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			return
		}
		addCSVToMeshArea(statement.attributeMap.get('work'), workMesh, registry)
	}
}

//deprecated
var gDerive2D = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'derive2D',
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var transform2Ds = getPointsByKey('transform2Ds', registry, statement)
		if (transform2Ds == null) {
			transform2Ds = []
		}
		var planes = getPointsByKey('planes', registry, statement)
		if (planes != null) {
			for (var plane of planes) {
				transform2Ds.push(get2DTransformByPlane(plane))
			}
			attributeMap.set('planes', planes.join(' '))
		}
		var polars = getPointsByKey('polars', registry, statement)
		if (polars != null) {
			for (var polar of polars) {
				transform2Ds.push(get2DTransformByPolar(polar))
			}
			attributeMap.set('polars', polars.join(' '))
		}
		var workStatement = getWorkStatement(registry, statement)
		var workPoints = null
		if (workStatement != null) {
			workPoints = getPointsByKey('points', registry, workStatement)
		}
		var polygon = getPointsByKey('polygon', registry, statement)
		var polyline = getPointsByKey('polyline', registry, statement)
		if (workPoints != null) {
			if (workStatement.tag == 'polygon') {
				if (polygon == null) {
					polygon = workPoints
				}
				else {
					pushArray(polygon, workPoints)
				}
			}
			else {
				if (workStatement.tag == 'polyline') {
					if (polyline == null) {
						polyline = workPoints
					}
					else {
						pushArray(polyline, workPoints)
					}
				}
			}
		}
		if (polygon != null) {
			for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
				transform2Ds.push(get2DTransformBySegment(polygon[pointIndex], polygon[(pointIndex + 1) % polygon.length]))
			}
		}
		if (polyline != null) {
			for (var pointIndex = 0; pointIndex < polyline.length - 1; pointIndex++) {
				transform2Ds.push(get2DTransformBySegment(polyline[pointIndex], polyline[pointIndex + 1]))
			}
		}
		var scale = getFloatsByStatement('scale', registry, statement)
		if (transform2Ds.length > 0) {
			if (!getIsEmpty(scale)) {
				if (scale.length == 1) {
					scale.push(scale[0])
				}
				for (var transform2D of transform2Ds) {
					var lengthX = Math.sqrt(transform2D[0] * transform2D[0] + transform2D[2] * transform2D[2])
					if (lengthX != 0.0) {
						lengthX /= scale[0]
						transform2D[0] /= lengthX
						transform2D[2] /= lengthX
					}
					var lengthY = Math.sqrt(transform2D[1] * transform2D[1] + transform2D[3] * transform2D[3])
					if (lengthY != 0.0) {
						lengthY /= scale[1]
						transform2D[1] /= lengthY
						transform2D[3] /= lengthY
					}
				}
			}
			attributeMap.set('transform2Ds', transform2Ds.join(' '))
		}
	}
}

var gPolygonAnalysis = {
	alterMesh: function(mesh, registry, statement) {
		if (mesh == null) {
			return
		}
		var analysisStatement = getStatement('polygonAnalysis')
		analysisStatement.attributeMap = getMeshAnalysis(mesh)
		analysisStatement.attributeMap.set('id', statement.attributeMap.get('id') + '_polygonAnalysis')
		analysisStatement.parent = statement
		statement.children.splice(-1, 0, analysisStatement)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'polygonAnalysis',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			statement.attributeMap = getMeshAnalysis(workMesh)
		}
	}
}

var gSTL = {
	alterMesh: function(mesh, registry, statement) {
		addSTLToMeshArea(statement.attributeMap.get('id'), mesh)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'stl',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			return
		}
		addSTLToMeshArea(statement.attributeMap.get('work'), workMesh)
	}
}

var gString = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'string',
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var variableMap = getVariableMapByParent(statement.parent)
		for (var key of attributeMap.keys()) {
			if (key != 'id') {
				variableMap.set(key, attributeMap.get(key))
			}
		}
	}
}

var gTransform2D = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'transform2D',
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var transform2Ds = getPointsByKey('transform2Ds', registry, statement)
		if (getIsEmpty(transform2Ds)) {
			transform2Ds = []
		}
		var planes = getPointsByKey('planes', registry, statement)
		if (planes != null) {
			for (var plane of planes) {
				transform2Ds.push(get2DTransformByPlane(plane))
			}
			attributeMap.set('planes', planes.join(' '))
		}
		var polars = getPointsByKey('polars', registry, statement)
		if (polars != null) {
			for (var polar of polars) {
				transform2Ds.push(get2DTransformByPolar(polar))
			}
			attributeMap.set('polars', polars.join(' '))
		}
		var workStatement = getWorkStatement(registry, statement)
		var workPoints = null
		if (workStatement != null) {
			workPoints = getPointsByKey('points', registry, workStatement)
		}
		var polygon = getPointsByKey('polygon', registry, statement)
		var polyline = getPointsByKey('polyline', registry, statement)
		if (workPoints != null) {
			if (workStatement.tag == 'polygon') {
				if (polygon == null) {
					polygon = workPoints
				}
				else {
					pushArray(polygon, workPoints)
				}
			}
			else {
				if (workStatement.tag == 'polyline') {
					if (polyline == null) {
						polyline = workPoints
					}
					else {
						pushArray(polyline, workPoints)
					}
				}
			}
		}
		if (polygon != null) {
			for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
				transform2Ds.push(get2DTransformBySegment(polygon[pointIndex], polygon[(pointIndex + 1) % polygon.length]))
			}
		}
		if (polyline != null) {
			for (var pointIndex = 0; pointIndex < polyline.length - 1; pointIndex++) {
				transform2Ds.push(get2DTransformBySegment(polyline[pointIndex], polyline[pointIndex + 1]))
			}
		}
		var scale = getFloatsByStatement('scale', registry, statement)
		if (transform2Ds.length > 0) {
			if (!getIsEmpty(scale)) {
				if (scale.length == 1) {
					scale.push(scale[0])
				}
				for (var transform2D of transform2Ds) {
					var lengthX = Math.sqrt(transform2D[0] * transform2D[0] + transform2D[2] * transform2D[2])
					if (lengthX != 0.0) {
						lengthX /= scale[0]
						transform2D[0] /= lengthX
						transform2D[2] /= lengthX
					}
					var lengthY = Math.sqrt(transform2D[1] * transform2D[1] + transform2D[3] * transform2D[3])
					if (lengthY != 0.0) {
						lengthY /= scale[1]
						transform2D[1] /= lengthY
						transform2D[3] /= lengthY
					}
				}
			}
			attributeMap.set('transform2Ds', transform2Ds.join(' '))
		}
	}
}

var gTriangleAnalysis = {
	alterMesh: function(mesh, registry, statement) {
		var analysisStatement = getStatement('triangleAnalysis')
		analysisStatement.attributeMap = getMeshAnalysis(getTriangleMesh(mesh))
		analysisStatement.attributeMap.set('id', statement.attributeMap.get('id') + '_triangleAnalysis')
		analysisStatement.parent = statement
		statement.children.splice(-1, 0, analysisStatement)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'triangleAnalysis',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			statement.attributeMap = getMeshAnalysis(getTriangleMesh(mesh))
		}
	}
}

var gVar = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
		var polylineMapEntries = []
		addFunctionToEntriesByName(arcWaveY, polylineMapEntries, 'arcWaveY', null)
		addFunctionToEntriesByName(getPointsByID, polylineMapEntries, 'pointsByID', gSetRS)
		addFunctionToEntriesByName(sineWave, polylineMapEntries, 'sineWave', null)
		addFunctionToEntriesByName(sineWaveY, polylineMapEntries, 'sineWaveY', null)
		var polylineMap = new Map(polylineMapEntries)
		addFunctionToVariableEntries(attributeByID, gSetRS)
		addFunctionToVariableEntries(border, gSetRS)
		addFunctionToVariableEntries(getIntervalsIncludingEnd, null)//deprecated
		addFunctionToEntriesByName(getPoint, gVariableMapEntries, 'point', gSetRS)
		addFunctionToEntriesByName(getPolar, gVariableMapEntries, 'polar', null)
		addFunctionToVariableEntries(intervals, null)
		addFunctionToVariableEntries(rightByID, gSetRS)
		addFunctionToVariableEntries(getStringLength, gSetS)
		addFunctionToVariableEntries(topByID, gSetRS)
		addFunctionToVariableEntries(workMesh, gSetRS)
		gVariableMapEntries.push(['Array', addVariableObjectToEntries(new Map(), Array)])
		gVariableMapEntries.push(['Date', addVariableObjectToEntries(new Map(), Date)])
		gVariableMapEntries.push(['Math', addVariableObjectToEntries(new Map(), Math)])
		gVariableMapEntries.push(['Number', addVariableObjectToEntries(new Map(), Number)])
		gVariableMapEntries.push(['String', addVariableObjectToEntries(new Map(), String)])
		gVariableMapEntries.push(['Polyline', polylineMap])
	},
	name: 'var',
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var variableMap = getVariableMapByParent(statement.parent)
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
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'view',
	processStatement:function(registry, statement) {
		var workStatement = getWorkStatement(registry, statement)
		if (workStatement != null) {
			this.alterMesh(null, registry, workStatement)
		}
	}
}

var gMetaProcessors = [
	gAbstract,
	gCopy,
	gCSV,
	gDerive2D,
	gPolygonAnalysis,
	gSTL,
	gString,
	gTransform2D,
	gTriangleAnalysis,
	gVar,
	gView]
