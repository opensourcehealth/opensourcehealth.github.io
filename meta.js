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

function addCSVToMeshArea(id, mesh, registry) {
	var meshString = getCSVMeshString(getNullOrValue('date', registry.storageMap), id, mesh, getNullOrValue('project', registry.storageMap))
	addToMeshArea(id, meshString)
}

function addFunctionToVariableEntries(functionToAdd, optionSet) {
	addFunctionToEntriesByName(functionToAdd, gVariableMapEntries, functionToAdd.name, optionSet)
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

function addSTLToMeshArea(id, mesh) {
	addToMeshArea(id, getSTLMeshString(id, mesh))
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
		alterMeshExcept(mesh, registry, statement, statement.tag)
		return
	}
	var points = getPointsHD(registry, statement)
	if (points != null) {
		setPointsHD(getPointsExcept(points, registry, statement, statement.tag), statement)
	}
}

function arcFromToAngle(registry, statement, fromX, fromY, toX, toY, angle, numberOfSides) {
	var variableMap = getVariableMapByStatement(statement.parent)
	var from = [-1.0, 0.0]
	var oldPoint = []
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			oldPoint = points[points.length - 1]
			if (oldPoint.length > 0) {
				from[0] = oldPoint[0]
				if (oldPoint.length > 1) {
					from[1] = oldPoint[1]
				}
			}
		}
	}
	from = [getValueByDefault(from[0], fromX), getValueByDefault(from[1], fromY)]
	var isOldPoint = false
	if (oldPoint.length > 1) {
		if (from[0] == oldPoint[0] && from[1] == oldPoint[1]) {
			isOldPoint = true
		}
	}
	var to = [getValueByDefault(1.0, toX), getValueByDefault(0.0, toY)]
	var fromTo = subtract2D(to.slice(0), from)
	var fromToLength = get2DLength(fromTo)
	if (fromToLength == 0.0) {
		return []
	}
	var center = multiply2DByScalar(add2D(from.slice(0), to), 0.5)
	var isClockwise = getValueByDefault(true, isClockwise)
	var numberOfSides = getValueByDefault(24, numberOfSides)
	var halfFromToLength = 0.5 * fromToLength
	var radius = halfFromToLength
	var isInverted = false
	if (angle != undefined) {
		angle *= gRadiansPerDegree
		if (Math.abs(angle) < gClose) {
			return [from, to]
		}
		if (angle < 0.0) {
			isInverted = true
			angle = -angle
		}
		var halfAngle = 0.5 * angle
		var right = [fromTo[1], -fromTo[0]]
		var perpendicularAngle = 0.5 * Math.PI - halfAngle
		multiply2DByScalar(right, 0.5 * Math.tan(perpendicularAngle))
		if (isInverted) {
			subtract2D(center, right)
		}
		else {
			add2D(center, right)
		}
		radius = Math.sqrt(halfFromToLength * halfFromToLength + get2DLengthSquared(right))
	}

	var fromAngle = Math.atan2(center[1] - from[1], from[0] - center[0])
	var toAngle = Math.atan2(center[1] - to[1], to[0] - center[0])
	if (toAngle < fromAngle) {
		toAngle += gDoublePi
	}
	if (isInverted) {
		fromAngle += gDoublePi
	}
	var angleDifference = toAngle - fromAngle
	var numberOfArcSides = Math.ceil(numberOfSides * Math.abs(angleDifference) / gDoublePi)
	var arcFromToRadius = []
	if (!isOldPoint) {
		arcFromToRadius.push(from)
	}
	var angleIncrement = angleDifference / numberOfArcSides
	for (var pointIndex = 1; pointIndex < numberOfArcSides; pointIndex++) {
		fromAngle += angleIncrement
		arcFromToRadius.push(add2D(get2DPolarByRadius(fromAngle, radius), center))
	}
	arcFromToRadius.push(to)
	return arcFromToRadius
}

//deprecated23
function arcFromToCenter(fromX, fromY, toX, toY, radius, isClockwise, numberOfSides) {
	var from = [getValueByDefault(-1.0, fromX), getValueByDefault(0.0, fromY)]
	var to = [getValueByDefault(1.0, toX), getValueByDefault(0.0, toY)]
	var fromTo = subtract2D(to.slice(0), from)
	var fromToLength = get2DLength(fromTo)
	if (fromToLength == 0.0) {
		return []
	}
	var center = multiply2DByScalar(add2D(from.slice(0), to), 0.5)
	var isClockwise = getValueByDefault(true, isClockwise)
	var numberOfSides = getValueByDefault(24, numberOfSides)
	var halfFromToLength = 0.5 * fromToLength
	if (radius == undefined) {
		radius = halfFromToLength
	}
	else {
		if (radius > halfFromToLength) {
			multiply2DByScalar(fromTo, Math.sqrt(radius * radius - halfFromToLength * halfFromToLength) / fromToLength)
			var right = [fromTo[1], -fromTo[0]]
			if (isClockwise) {
				add2D(center, right)
			}
			else {
				subtract2D(center, right)
			}
		}
		else {
			radius = halfFromToLength
		}
	}
	var fromAngle = Math.atan2(center[1] - from[1], from[0] - center[0])
	var toAngle = Math.atan2(center[1] - to[1], to[0] - center[0])
	if (toAngle < fromAngle) {
		toAngle += gDoublePi
	}
	var angleDifference = toAngle - fromAngle
	var numberOfArcSides = Math.ceil(numberOfSides * angleDifference / gDoublePi)
	var arcFromToCenter = new Array(numberOfArcSides + 1)
	arcFromToCenter[0] = from
	arcFromToCenter[numberOfArcSides] = to
	var angleIncrement = angleDifference / numberOfArcSides
	for (var pointIndex = 1; pointIndex < numberOfArcSides; pointIndex++) {
		fromAngle += angleIncrement
		arcFromToCenter[pointIndex] = add2D(get2DPolarByRadius(fromAngle, radius), center)
	}
	return arcFromToCenter
}

function arcFromToRadius(registry, statement, fromX, fromY, toX, toY, radius, isClockwise, numberOfSides) {
	var variableMap = getVariableMapByStatement(statement.parent)
	var from = [-1.0, 0.0]
	var oldPoint = []
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			oldPoint = points[points.length - 1]
			if (oldPoint.length > 0) {
				from[0] = oldPoint[0]
				if (oldPoint.length > 1) {
					from[1] = oldPoint[1]
				}
			}
		}
	}
	from = [getValueByDefault(from[0], fromX), getValueByDefault(from[1], fromY)]
	var isOldPoint = false
	if (oldPoint.length > 1) {
		if (from[0] == oldPoint[0] && from[1] == oldPoint[1]) {
			isOldPoint = true
		}
	}
	var to = [getValueByDefault(1.0, toX), getValueByDefault(0.0, toY)]
	var fromTo = subtract2D(to.slice(0), from)
	var fromToLength = get2DLength(fromTo)
	if (fromToLength == 0.0) {
		return []
	}
	var center = multiply2DByScalar(add2D(from.slice(0), to), 0.5)
	var isClockwise = getValueByDefault(true, isClockwise)
	var numberOfSides = getValueByDefault(24, numberOfSides)
	var halfFromToLength = 0.5 * fromToLength
	if (radius == undefined) {
		radius = halfFromToLength
	}
	else {
		if (Math.abs(radius) > halfFromToLength) {
			multiply2DByScalar(fromTo, Math.sqrt(radius * radius - halfFromToLength * halfFromToLength) / fromToLength)
			var right = [fromTo[1], -fromTo[0]]
			if (isClockwise && radius > 0.0) {
				add2D(center, right)
			}
			else {
				subtract2D(center, right)
			}
			radius = Math.abs(radius)
		}
		else {
			radius = halfFromToLength
		}
	}
	var fromAngle = Math.atan2(center[1] - from[1], from[0] - center[0])
	var toAngle = Math.atan2(center[1] - to[1], to[0] - center[0])
	if (toAngle < fromAngle) {
		toAngle += gDoublePi
	}
	var angleDifference = toAngle - fromAngle
	var numberOfArcSides = Math.ceil(numberOfSides * angleDifference / gDoublePi)
	var arcFromToRadius = []
	if (!isOldPoint) {
		arcFromToRadius.push(from)
	}
	var angleIncrement = angleDifference / numberOfArcSides
	var angle = fromAngle
	for (var pointIndex = 1; pointIndex < numberOfArcSides; pointIndex++) {
		angle += angleIncrement
		arcFromToRadius.push(add2D(get2DPolarByRadius(angle, radius), center))
	}
	arcFromToRadius.push(to)
	return arcFromToRadius
}

function arcTo(registry, statement, toX, toY, numberOfSides) {
	var variableMap = getVariableMapByStatement(statement.parent)
	if (!variableMap.has('_points')) {
		warningByList(['In arcTo in meta the variableMap does not have _points:', toX, toY, statement])
		return [[to]]
	}
	var points = variableMap.get('_points')
	if (points.length < 2) {
		warningByList(['In arcTo in meta _points is shorter than 2:', points, toX, toY, statement])
		return [[to]]
	}
	var from = points[points.length - 1]
	var to = [getValueByDefault(1.0, toX), getValueByDefault(0.0, toY)]
	var numberOfSides = getValueByDefault(24, numberOfSides)
	var beginPoint = points[points.length - 2]
	var fromBegin = normalize2D(get2DSubtraction(beginPoint, from))
	var rotation = [fromBegin[1], fromBegin[0]]
	var fromRotated = get2DRotation(from, rotation)
	var toRotated = get2DRotation(to, rotation)
	var midpointRotated = get2DMultiplicationByScalar(get2DAddition(fromRotated, toRotated), 0.5)
	var midpointFromRotated = normalize2D(get2DSubtraction(fromRotated, midpointRotated))
	if (midpointFromRotated[0] == 0.0) {
		return [[to]]
	}
	var xIntercept = midpointRotated[0] + midpointFromRotated[1] * (midpointRotated[1] - fromRotated[1]) / midpointFromRotated[0]
	var center = get2DRotation([xIntercept, fromRotated[1]], [rotation[0], -rotation[1]])
	var radius = Math.abs(fromRotated[0] - xIntercept)
	var fromAngle = Math.atan2(center[1] - from[1], from[0] - center[0])
	var toAngle = Math.atan2(center[1] - to[1], to[0] - center[0])
	if (toAngle < fromAngle) {
		toAngle += gDoublePi
	}
	if (get2DDotProduct(fromBegin, [Math.sin(fromAngle), Math.cos(fromAngle)]) < 0.0) {
		fromAngle += gDoublePi
	}
	var angleDifference = toAngle - fromAngle
	var numberOfArcSides = Math.ceil(numberOfSides * Math.abs(angleDifference) / gDoublePi)
	var arcTo = []
	var angleIncrement = angleDifference / numberOfArcSides
	for (var pointIndex = 1; pointIndex < numberOfArcSides; pointIndex++) {
		fromAngle += angleIncrement
		arcTo.push(add2D(get2DPolarByRadius(fromAngle, radius), center))
	}
	arcTo.push(to)
	return arcTo
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
	return getStatementByID(registry, statement, id).attributeMap.get(key)
}

function border(registry, statement, id) {
	return 10.0
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
	var closestDistance = Number.MAX_VALUE
	for (var point of points) {
		var distance = getArrayDistanceSquared(location, point)
		if (distance < closestDistance) {
			closestDistance = distance
		}
	}
	return closestDistance
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
			matrix3Ds.push(getMatrix3DByTranslate3D(plane))
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

//deprecated23
/*
function getOutsideTangent(center, intersection, radius, reverse) {
	var centerIntersection = get2DSubtraction(intersection, center)
	var centerIntersectionLength = get2DLength(centerIntersection)
	divide2DByScalar(centerIntersection, centerIntersectionLength)
	var oppositeLength = Math.sqrt(centerIntersectionLength * centerIntersectionLength - radius * radius)
	var centerIntersectionRight = [centerIntersection[1], -centerIntersection[0]]
	if (reverse) {
		multiply2DByScalar(centerIntersectionRight, -1.0)
	}
	var tangent = get2DAddition(center, get2DMultiplicationByScalar(centerIntersection, radius * radius / centerIntersectionLength))
	return add2D(tangent, get2DMultiplicationByScalar(centerIntersectionRight, radius * oppositeLength / centerIntersectionLength))
}
*/

function getPoint(registry, statement, name, x, y, z) {
	var pointArgumentsLength = arguments.length - 3
	var point = new Array(pointArgumentsLength)
	for (var argumentIndex = 0; argumentIndex < pointArgumentsLength; argumentIndex++) {
		point[argumentIndex] = arguments[argumentIndex + 3]
	}
	var variableMap = getVariableMapByStatement(statement.parent)
	if (variableMap.has('_points')) {
		var points = variableMap.get('_points')
		if (points.length > 0) {
			var oldPoint = points[points.length - 1]
			for (var oldIndex = 0; oldIndex < Math.min(point.length, oldPoint.length); oldIndex++) {
				if (point[oldIndex] == undefined) {
					point[oldIndex] = oldPoint[oldIndex]
				}
			}
		}
	}
	variableMap.set(name, point.toString())
	return point
}

function getPolar(length, inputAngle) {
	var angle = 0.0
	if (inputAngle != undefined) {
		angle = inputAngle * gRadiansPerDegree
	}
	return get2DPolarByRadius(angle, length)
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

function getStringLength(word) {
	return word.length
}

function getSuffixedString(root, suffix) {
	if (suffix == null) {
		return root
	}
	return root + suffix
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

function operation(registry, statement, symbol, elements, otherElements) {
	if (getIsEmpty(elements)) {
		return []
	}
	if (otherElements == null || otherElements == undefined) {
		return []
	}
	if (!Array.isArray(otherElements)) {
		otherElements = [otherElements]
	}
	if (otherElements.length == 0) {
		return []
	}
	var symbol = getValueByDefault('+', symbol)
	var monad = new VariableMonad()
	for (var character of symbol) {
		monad = monad.getNextMonad(character, registry, statement)
	}
	var previousMonad = monad.previousMonad
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		previousMonad.value = elements[elementIndex]
		elements[elementIndex] = monad.getResult(registry, statement, otherElements[elementIndex % otherElements.length])
	}
	return elements
}

function pointsByID(registry, statement, id) {
	return getPointsHD(registry, getStatementByID(registry, statement, id))
}

function rightByID(registry, statement, id) {
	var boundingBox = getGroupBoundingBoxByArguments(id, registry, statement)
	if (boundingBox == null) {
		return 0.0
	}
	return boundingBox[1][0]
}

function setAttributeByID(registry, statement, key, id, value) {
	return getStatementByID(registry, statement, id).attributeMap.set(key, value)
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
	var boundingBox = getGroupBoundingBoxByArguments(id, registry, statement)
	if (boundingBox == null) {
		return 0.0
	}
	return boundingBox[1][1]
}

function toward(point, distance, x, y) {
	if (getIsEmpty(point)) {
		point = [0.0, 0.0]
	}
	if (point.length == 1) {
		point.push(0.0)
	}
	var distance = getValueByDefault(1.0, distance)
	var x = getValueByDefault(0.0, x)
	var y = getValueByDefault(0.0, y)
	var xyPoint = [x - point[0], y - point[1]]
	xyPointLength = get2DLength(xyPoint)
	if (xyPointLength == 0.0) {
		return point
	}
	return get2DAddition(point, multiply2DByScalar(xyPoint, distance / xyPointLength))
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

function zigzag(polyline, radiusMultiplier, numberOfSides) {
	if (polyline.length < 3) {
		return polyline
	}
	var numberOfSides = getValueByDefault(24, numberOfSides)
	var radiusMultiplier = getValueByDefault(0.2, radiusMultiplier)
	var centerIntersections = new Array(polyline.length)
	centerIntersections[0] = {intersection:polyline[0]}
	centerIntersections[polyline.length - 1] = {intersection:polyline[polyline.length - 1]}
	var zigzagPolyline = [polyline[0]]
	for (var vertexIndex = 1; vertexIndex < polyline.length - 1; vertexIndex++) {
		var beginPoint = polyline[vertexIndex - 1]
		var centerPoint = polyline[vertexIndex]
		var centerBegin = get2DSubtraction(beginPoint, centerPoint)
		var centerBeginLength = get2DLength(centerBegin)
		var endPoint = polyline[vertexIndex + 1]
		var centerEnd = get2DSubtraction(endPoint, centerPoint)
		var centerEndLength = get2DLength(centerEnd)
		var intersection = get2DMultiplicationByScalar(centerBegin, 0.5)
		add2D(intersection, centerPoint)
		divide2DByScalar(centerBegin, centerBeginLength)
		divide2DByScalar(centerEnd, centerEndLength)
		centerIntersections[vertexIndex] = {
		centerBegin:centerBegin, centerBeginLength:centerBeginLength,
		centerEnd:centerEnd, centerEndLength:centerEndLength, centerPoint:centerPoint, intersection:intersection}
	}
	for (var vertexIndex = 1; vertexIndex < polyline.length - 1; vertexIndex++) {
		var centerIntersection = centerIntersections[vertexIndex]
		var centerPoint = centerIntersection.centerPoint
		var middleBegin = get2DAddition(centerIntersection.centerBegin, centerIntersection.centerEnd)
		normalize2D(middleBegin)
		var beginEndDistance = Math.min(1.0, get2DDistance(centerIntersection.centerBegin, centerIntersection.centerEnd))
		beginEndDistance *= radiusMultiplier
		var right = [middleBegin[1], -middleBegin[0]]
		var dotProduct = get2DDotProduct(right, centerIntersection.centerBegin)
		if (dotProduct < 0.0) {
			multiply2DByScalar(right, -1)
		}
		var left = get2DMultiplicationByScalar(right, -1.0)
		multiply2DByScalar(left, centerIntersection.centerEndLength * beginEndDistance)
		multiply2DByScalar(right, centerIntersection.centerBeginLength * beginEndDistance)
		var rightPoint = get2DAddition(centerPoint, right)
		var rightBefore = get2DSubtraction(centerIntersection.intersection, rightPoint)
		var leftPoint = get2DAddition(centerPoint, left)
		var leftAfter = get2DSubtraction(centerIntersections[vertexIndex + 1].intersection, leftPoint)
		var quarterNumberOfSides = Math.ceil(numberOfSides * 0.25)
		for (var pointIndex = quarterNumberOfSides - 1; pointIndex > 0; pointIndex--) {
			var along = pointIndex / quarterNumberOfSides
			var combinedPoint = get2DAddition(rightPoint, get2DMultiplicationByScalar(rightBefore, along))
			var alongRight = get2DAddition(centerPoint, get2DMultiplicationByScalar(right, along))
			add2D(multiply2DByScalar(combinedPoint, along), multiply2DByScalar(alongRight, 1.0 - along))
			zigzagPolyline.push(combinedPoint)
		}
		zigzagPolyline.push(centerPoint)
		for (var pointIndex = 1; pointIndex < quarterNumberOfSides; pointIndex++) {
			var along = pointIndex / quarterNumberOfSides
			var combinedPoint = get2DAddition(leftPoint, get2DMultiplicationByScalar(leftAfter, along))
			var alongLeft = get2DAddition(centerPoint, get2DMultiplicationByScalar(left, along))
			add2D(multiply2DByScalar(combinedPoint, along), multiply2DByScalar(alongLeft, 1.0 - along))
			zigzagPolyline.push(combinedPoint)
		}
	}
	zigzagPolyline.push(polyline[polyline.length - 1])
	return zigzagPolyline
}

//deprecated23
/*
function zigzagArc(polyline, radiusMultiplier, numberOfSides) {
	if (polyline.length < 3) {
		return polyline
	}
	var numberOfSides = getValueByDefault(24, numberOfSides)
	var radiusMultiplier = getValueByDefault(0.25, radiusMultiplier)
	var radiusVectors = new Array(polyline.length)
	radiusVectors[0] = {radius:0.0}
	radiusVectors[polyline.length - 1] = {intersection:polyline[polyline.length - 1], radius:0.0}
	var zigzagPolyline = [polyline[0]]
	for (var vertexIndex = 1; vertexIndex < polyline.length - 1; vertexIndex++) {
		var beginPoint = polyline[vertexIndex - 1]
		var centerPoint = polyline[vertexIndex]
		var centerBegin = get2DSubtraction(beginPoint, centerPoint)
		var centerBeginLength = get2DLength(centerBegin)
		var endPoint = polyline[vertexIndex + 1]
		var centerEnd = get2DSubtraction(endPoint, centerPoint)
		var centerEndLength = get2DLength(centerEnd)
		var radius = Math.min(centerBeginLength, centerEndLength) * radiusMultiplier
		var intersection = get2DMultiplicationByScalar(centerBegin, radius / (radius + radiusVectors[vertexIndex - 1].radius))
		add2D(intersection, centerPoint)
		divide2DByScalar(centerBegin, centerBeginLength)
		divide2DByScalar(centerEnd, centerEndLength)
		radiusVectors[vertexIndex] = {
		centerBegin:centerBegin, centerBeginLength:centerBeginLength,
		centerEnd:centerEnd, centerEndLength:centerEndLength, centerPoint:centerPoint, intersection:intersection, radius:radius}
	}
	for (var vertexIndex = 1; vertexIndex < polyline.length - 1; vertexIndex++) {
		var radiusVector = radiusVectors[vertexIndex]
		var centerPoint = radiusVector.centerPoint
		var middleBegin = get2DAddition(radiusVector.centerBegin, radiusVector.centerEnd)
		normalize2D(middleBegin)
		var reverse = radiusVector.centerBegin[0] * -middleBegin[1] + radiusVector.centerBegin[1] * middleBegin[0] > 0.0
		var radius = radiusVector.radius
		var center = get2DAddition(centerPoint, multiply2DByScalar(middleBegin, radius))
		var from = getOutsideTangent(center, radiusVector.intersection, radius, reverse)
		var to = getOutsideTangent(center, radiusVectors[vertexIndex + 1].intersection, radius, !reverse)
		var beginAngle = getInteriorAngle(from, centerPoint, radius)
		var totalAngle = beginAngle + getInteriorAngle(to, centerPoint, radius)
		var fromAngle = Math.atan2(center[1] - from[1], from[0] - center[0])
		var toAngle = Math.atan2(center[1] - to[1], to[0] - center[0])
		var numberOfArcSides = Math.ceil(numberOfSides * totalAngle / gDoublePi)
		var angleIncrement = totalAngle / numberOfArcSides
		var addBegin = add2D(get2DPolarByRadius(fromAngle+beginAngle, radius), center)
		var minusBegin = add2D(get2DPolarByRadius(fromAngle-beginAngle, radius), center)
		if (get2DDistanceSquared(addBegin, centerPoint) > get2DDistanceSquared(minusBegin, centerPoint)) {
			angleIncrement = -angleIncrement
		}
		zigzagPolyline.push(from)
		for (var pointIndex = 1; pointIndex < numberOfArcSides; pointIndex++) {
			fromAngle += angleIncrement
			zigzagPolyline.push(add2D(get2DPolarByRadius(fromAngle, radius), center))
		}
		zigzagPolyline.push(to)
	}
	zigzagPolyline.push(polyline[polyline.length - 1])
	return zigzagPolyline
}
*/

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
		addCSVToMeshArea(statement.attributeMap.get('id'), mesh, registry)
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
			addCSVToMeshArea(statement.attributeMap.get('work'), workMesh, registry)
		}
	}
}

//deprecated23
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
		//deprecated
		gTagCenterMap.set('derive2D', this)
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
		var analysisStatement = getStatementByParentTag(getMeshAnalysis(mesh), 0, statement, 'polygonAnalysis')
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
			statement.attributeMap = getMeshAnalysis(workMesh)
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
		addSTLToMeshArea(statement.attributeMap.get('id'), mesh)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'stl',
	processStatement: function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			addSTLToMeshArea(statement.attributeMap.get('work'), workMesh)
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
		var analysisStatement = getStatementByParentTag(getMeshAnalysis(getTriangleMesh(mesh)), 0, statement, 'triangleAnalysis')
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
			statement.attributeMap = getMeshAnalysis(workMesh)
		}
		if (workMesh != null) {
			statement.attributeMap = getMeshAnalysis(getTriangleMesh(workMesh))
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
		var polylineMapEntries = []
		addFunctionToEntriesByName(arcWaveY, polylineMapEntries, 'arcWaveY', null)
		addFunctionToEntriesByName(operation, polylineMapEntries, 'operation', gSetRS)
		addFunctionToEntriesByName(pointsByID, polylineMapEntries, 'pointsByID', gSetRS)
		addFunctionToEntriesByName(sineWave, polylineMapEntries, 'sineWave', null)
		addFunctionToEntriesByName(sineWaveY, polylineMapEntries, 'sineWaveY', null)
		addFunctionToVariableEntries(arcFromToAngle, gSetR)
		addFunctionToVariableEntries(arcFromToCenter, null)
		addFunctionToVariableEntries(arcFromToRadius, gSetR)
		addFunctionToVariableEntries(arcTo, gSetR)
		addFunctionToVariableEntries(attributeByID, gSetRS)
		addFunctionToVariableEntries(border, gSetRS)

		addFunctionToVariableEntries(getIntervalsIncludingEnd, null)//deprecated23

		addFunctionToEntriesByName(getPoint, gVariableMapEntries, 'point', gSetRS)
		addFunctionToEntriesByName(getPolar, gVariableMapEntries, 'polar', null)
		addFunctionToVariableEntries(intervals, null)
		addFunctionToVariableEntries(rightByID, gSetRS)
		addFunctionToVariableEntries(getStringLength, gSetS)
		addFunctionToVariableEntries(setAttributeByID, gSetRS)
		addFunctionToVariableEntries(topByID, gSetRS)
		addFunctionToVariableEntries(toward, null)
		addFunctionToVariableEntries(zigzag, null)
		addFunctionToVariableEntries(arcFromToCenter, null)
		gVariableMapEntries.push(['Array', addVariableObjectToEntries(new Map(), Array)])
		gVariableMapEntries.push(['Date', addVariableObjectToEntries(new Map(), Date)])
		gVariableMapEntries.push(['Math', addVariableObjectToEntries(new Map(), Math)])
		gVariableMapEntries.push(['Number', addVariableObjectToEntries(new Map(), Number)])
		gVariableMapEntries.push(['Poly', new Map(polylineMapEntries)])

		//deprecated23
		gVariableMapEntries.push(['Polyline', new Map(polylineMapEntries)])

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
		setMapIfMissing('skip3D', statement.attributeMap, 'true')
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
