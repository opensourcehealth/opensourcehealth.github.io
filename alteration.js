//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addFilletedPoints(filletedPolygon, minimumAngle, numberOfSides, polygon, radius, vertexIndex) {
	var beginPoint = polygon[(vertexIndex - 1 + polygon.length) % polygon.length]
	var centerPoint = polygon[vertexIndex]
	var endPoint = polygon[(vertexIndex + 1) % polygon.length]
	addFilletedPointsByTriple(beginPoint, centerPoint, endPoint, filletedPolygon, minimumAngle, numberOfSides, radius)
}

function addFilletedPointsByTriple(beginPoint, centerPoint, endPoint, filletedPolygon, minimumAngle, numberOfSides, radius) {
	var centerBegin = getSubtraction2D(beginPoint, centerPoint)
	var centerBeginLength = length2D(centerBegin)
	var centerEnd = getSubtraction2D(endPoint, centerPoint)
	var centerEndLength = length2D(centerEnd)
	divide2DScalar(centerBegin, centerBeginLength)
	divide2DScalar(centerEnd, centerEndLength)
	var absoluteCornerAngle = 2.0 * Math.asin(0.5 * distance2D(centerBegin, getMultiplication2DScalar(centerEnd, -1)))
	var cornerOverMinimum = absoluteCornerAngle / minimumAngle
	var numberOfFilletSides = Math.ceil(cornerOverMinimum - gClose)
	if (numberOfFilletSides < 2) {
		filletedPolygon.push(centerPoint)
		return
	}
	var centerVector = normalize2D(getAddition2D(centerBegin, centerEnd))
	var dotProduct = dotProduct2D(centerVector, centerBegin)
	var maximumLength = 0.5 * Math.min(centerBeginLength, centerEndLength)
	var perpendicular = Math.sqrt(1.0 - dotProduct * dotProduct)
	var distanceToTangent = radius * dotProduct / perpendicular
	if (distanceToTangent > maximumLength) {
		var lengthRatio = maximumLength / distanceToTangent
		numberOfFilletSides = Math.ceil(Math.sqrt(lengthRatio) * cornerOverMinimum - gClose)
		if (numberOfFilletSides < 2) {
			filletedPolygon.push(centerPoint)
			return
		}
		radius *= lengthRatio
		distanceToTangent *= lengthRatio
	}
	var halfSideLength = Math.tan(0.5 * absoluteCornerAngle / numberOfFilletSides) * radius
	var beginTangent = getAddition2D(centerPoint, getMultiplication2DScalar(centerBegin, distanceToTangent - halfSideLength))
	var filletCenter = getAddition2D(centerPoint, getMultiplication2DScalar(centerVector, radius / perpendicular))
	var filletAngle = absoluteCornerAngle / numberOfFilletSides
	if (dotProduct2D([centerBegin[1], -centerBegin[0]], centerEnd) > 0.0) {
		filletAngle = -filletAngle
	}
	filletedPolygon.push(beginTangent)
	var beginTangentCenter = getSubtraction2D(beginTangent, filletCenter)
	var filletRotation = getPolar(filletAngle)
	for (var filletIndex = 1; filletIndex < numberOfFilletSides; filletIndex++) {
		beginTangentCenter = get2DRotation(beginTangentCenter, filletRotation)
		filletedPolygon.push(getAddition2D(filletCenter, beginTangentCenter))
	}
}

function addMirrorPoints(centerDirection, mirrorStart, points) {
	addRotationToCenterDirection(centerDirection)
	var pointZero = points[0]
	var pointStart = points[mirrorStart]
	if (distanceSquared2D(pointStart, mirrorByCenterDirectionRotation(centerDirection, pointStart.slice(0))) < gCloseSquared) {
		mirrorStart -= 1
	}
	for (var pointIndex = mirrorStart; pointIndex > -1; pointIndex--) {
		var mirrorPoint = mirrorByCenterDirectionRotation(centerDirection, points[pointIndex].slice(0))
		if (distanceSquared2D(pointZero, mirrorPoint) < gCloseSquared) {
			break
		}
		points.push(mirrorPoint)
	}
}

function addRotationToCenterDirection(centerDirection) {
	var reverseRotation = [centerDirection.direction[0], -centerDirection.direction[1]]
	var lineRotatedY = centerDirection.center[0] * reverseRotation[1] + centerDirection.center[1] * reverseRotation[0]
	centerDirection.reverseRotation = reverseRotation
	centerDirection.mirrorFromY = lineRotatedY + lineRotatedY
}

function addSplitPolygonByHeight(polygon, polygons, splitHeight) {
	var alongIndexesMap = new Map()
	var meetings = []
	var toolAlongIndexes = []
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var endIndex = (vertexIndex + 1) % polygon.length
		var beginPoint = polygon[vertexIndex]
		var endPoint = polygon[endIndex]
		var meeting = getMeetingByHeight(splitHeight, beginPoint, endPoint)
		if (meeting != null) {
			if (meeting.isWorkNode) {
				if (meeting.workAlong < 0.5) {
					meeting.key = beginPoint[0].toString() + ' ' + beginPoint[1].toString()
				}
				else {
					meeting.key = endPoint[0].toString() + ' ' + endPoint[1].toString()
				}
			}
			else {
				var x = beginPoint[0] * (1.0 - meeting.workAlong) + endPoint[0] * meeting.workAlong
				meeting.key = x.toString() + ' ' + splitHeight.toString()
			}
			addMeetingToMap(meeting.workAlong, alongIndexesMap, meeting.isWorkNode, '', meetings.length, vertexIndex, polygon.length)
			toolAlongIndexes.push([meeting.toolAlong, meetings.length])
			meetings.push(meeting)
		}
	}
	toolAlongIndexes.sort(compareFirstElementAscending)
	for (var index = toolAlongIndexes.length - 1; index > 0; index--) {
		if (meetings[toolAlongIndexes[index][1]].key == meetings[toolAlongIndexes[index - 1][1]].key) {
			toolAlongIndexes.splice(index, 1)
		}
	}
	addSplitPolygons(alongIndexesMap, meetings, polygon, polygons, toolAlongIndexes)
}

function addSplitPolygons(alongIndexesMap, meetings, polygon, polygons, toolAlongIndexes) {
	if (meetings.length == 0) {
		return
	}
	var arcMap = new Map()
	var pointMap = new Map()
	var toolBeginMap = new Map()
	var toolEndMap = new Map()
	var toolLineSet = new Set()
	var toolIndexSet = new Set()
	sortRemoveMeetings(alongIndexesMap, meetings)
	for (var vertexIndex = polygon.length - 1; vertexIndex > -1; vertexIndex--) {
		var key = vertexIndex.toString()
		if (alongIndexesMap.has(key)) {
			var alongIndexes = alongIndexesMap.get(key)
			for (var alongIndexIndex = alongIndexes.length - 1; alongIndexIndex > -1; alongIndexIndex--) {
				var alongIndex = alongIndexes[alongIndexIndex]
				if (alongIndex[0] != 0.0) {
					var keyStrings = meetings[alongIndex[1]].key.split(' ')
					polygon.splice(vertexIndex + 1, 0, [parseFloat(keyStrings[0]), parseFloat(keyStrings[1])])
				}
			}
		}
	}
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var point = polygon[vertexIndex]
		pointMap.set(point[0].toString() + ' ' + point[1].toString(), vertexIndex)
	}
	for (var meeting of meetings) {
		meeting.pointIndex = pointMap.get(meeting.key)
		meeting.point = polygon[meeting.pointIndex]
	}
	for (var toolAlongIndex of toolAlongIndexes) {
		toolIndexSet.add(meetings[toolAlongIndex[1]].pointIndex)
	}
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var endIndex = polygon[(vertexIndex + 1) % polygon.length]
		if (toolIndexSet.has(vertexIndex) && toolIndexSet.has(endIndex)) {
			toolLineSet.add(getEdgeKey(vertexIndex, endIndex))
		}
	}
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var beginIndex = (vertexIndex + 1) % polygon.length
		var endIndex = (vertexIndex + 2) % polygon.length
		var key = beginIndex + ' ' + endIndex
		arcMap.set(key, [vertexIndex, (vertexIndex + 3) % polygon.length])
		if (toolIndexSet.has(beginIndex)) {
			toolBeginMap.set(beginIndex, key)
		}
		if (toolIndexSet.has(endIndex)) {
			toolEndMap.set(endIndex, key)
		}
	}
	for (var toolAlongIndexesIndex = 0; toolAlongIndexesIndex < toolAlongIndexes.length - 1; toolAlongIndexesIndex++) {
		var beginMeeting = meetings[toolAlongIndexes[toolAlongIndexesIndex][1]]
		var endMeeting = meetings[toolAlongIndexes[toolAlongIndexesIndex + 1][1]]
		var beginKey = beginMeeting.pointIndex
		var endKey = endMeeting.pointIndex
		if (!toolLineSet.has(getEdgeKey(beginKey, endKey))) {
			var midpoint = multiply2DScalar(getAddition2D(beginMeeting.point, endMeeting.point), 0.5)
			if (getIsPointInsidePolygonOrClose(midpoint, polygon)) {
				var beginEntryKey = toolEndMap.get(beginKey)
				var beginExitKey = toolBeginMap.get(beginKey)
				var endEntryKey = toolEndMap.get(endKey)
				var endExitKey = toolBeginMap.get(endKey)
				arcMap.set(beginKey + ' ' + endKey, [parseInt(beginEntryKey.split(' ')[0]), parseInt(endExitKey.split(' ')[1])])
				arcMap.set(endKey + ' ' + beginKey, [parseInt(endEntryKey.split(' ')[0]), parseInt(beginExitKey.split(' ')[1])])
				arcMap.get(beginEntryKey)[1] = endKey
				arcMap.get(beginExitKey)[0] = endKey
				arcMap.get(endEntryKey)[1] = beginKey
				arcMap.get(endExitKey)[0] = beginKey
				toolAlongIndexesIndex += 1
			}
		}
	}
	var joinedFacets = getJoinedFacetsByArcMap(arcMap)
	var points = getArraysCopy(polygon)
	overwriteArray(polygon, getPolygonByFacet(joinedFacets[0], points))
	for (var joinedFacetIndex = 1; joinedFacetIndex < joinedFacets.length; joinedFacetIndex++) {
		polygons.push(getPolygonByFacet(joinedFacets[joinedFacetIndex], points))
	}
}

function addSplitPolygonsByHeight(polygons, splitHeight) {
	var polygonsLength = polygons.length
	for (var polygonIndex = 0; polygonIndex < polygonsLength; polygonIndex++) {
		var polygon = polygons[polygonIndex]
		addSplitPolygonByHeight(polygon, polygons, splitHeight)
	}
}

function addSplitPolygonsByHeights(polygons, splitHeights) {
	for (var splitHeight of splitHeights) {
		addSplitPolygonsByHeight(polygons, splitHeight)
	}
}

function addTo3DPointIndexSet(equations, pointIndexSet, points, polygons, registry, statement, stratas) {
	if (getIsEmpty(equations) && pointIndexSet.size == 0 && getIsEmpty(polygons)) {
		for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
			pointIndexSet.add(pointIndex)
		}
		return
	}
	if (equations != null) {
		var variableMap = getVariableMapByStatement(statement)
		for (var equation of equations) {
			for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
				variableMap.set('point', points[pointIndex].toString())
				if (getValueByEquation(registry, statement, equation)) {
					pointIndexSet.add(pointIndex)
				}
			}
		}
	}
	if (polygons == null) {
		return
	}
	for (var polygon of polygons) {
		var boundingBox = getBoundingBox(polygon)
		for (var strata of stratas) {
			for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
				var point = points[pointIndex]
				if (getIsInStrata(strata, point[2])) {
					if (isPointInsideBoundingBoxOrClose(boundingBox, point)) {
						if (getIsPointInsidePolygonOrClose(point, polygon)) {
							pointIndexSet.add(pointIndex)
						}
					}
				}
			}
		}
	}
}

function alterMeshExcept(mesh, registry, statement) {
	if (statement.attributeMap.has('alterations')) {
		var alterations = statement.attributeMap.get('alterations').split(',').filter(lengthCheck)
		for (var alteration of alterations) {
			alteration = alteration.trim()
			if (gAlterMeshMap.has(alteration)) {
				gAlterMeshMap.get(alteration).alterMesh(mesh, registry, statement)
			}
		}
	}
}

//deprecated
function analyzeOutputMesh(mesh, registry, statement) {
	var id = statement.attributeMap.get('id')
	registry.meshMap.set(id, mesh)
	alterMeshExcept(mesh, registry, statement)
}

function bevelPoints(bevels, matrix3D, mesh, pointIndexSet, points, splits) {
	var facets = mesh.facets
	bevels = getPushArray(bevels, splits)
	if (bevels == null) {
		return
	}
	bevels.sort(compareFirstElementAscending)
	for (var bevel of bevels) {
		if (bevel.length == 1) {
			bevel.push(bevel[0])
		}
		if (bevel.length == 2) {
			bevel.push(0.0)
		}
	}
	var horizontalDirectionMap = new Map()
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var normal = getNormalByFacet(facets[facetIndex], points)
		if (normal != null) {
			var facet = facets[facetIndex]
			for (var pointIndex of facet) {
				if (pointIndexSet.has(pointIndex)) {
					normal.push(facetIndex)
					for (var pointIndex of facet) {
						addElementToMapArray(normal, pointIndex, horizontalDirectionMap)
					}
					break
				}
			}
		}
	}
	var bevelMap = new Map()
	for (var pointIndex of pointIndexSet) {
		var interpolationAlong = getFlatInterpolationAlongBeginEnd(points[pointIndex][2], bevels)
		var along = interpolationAlong[0]
		var lower = interpolationAlong[1]
		var upper = interpolationAlong[2]
		var oneMinus = 1.0 - along
		var inset = [oneMinus * lower[0] + along * upper[0], oneMinus * lower[1] + along * upper[1]]
		var unitVectors = horizontalDirectionMap.get(pointIndex)
		var horizontalVectorIndex = null
		var smallestZ = Number.MAX_VALUE
		for (var unitVectorIndex = 0; unitVectorIndex < unitVectors.length; unitVectorIndex++) {
			var z = Math.abs(unitVectors[unitVectorIndex][2])
			if (z < smallestZ) {
				smallestZ = z
				horizontalVectorIndex = unitVectorIndex
			}
		}
		var horizontalVector = unitVectors[horizontalVectorIndex]
		var highestCrossProductZ = -Number.MAX_VALUE
		var otherVectorIndex = null
		for (var unitVectorIndex = 0; unitVectorIndex < unitVectors.length; unitVectorIndex++) {
			if (unitVectorIndex != horizontalVectorIndex) {
				var crossProductZ = Math.abs(crossProduct2D(horizontalVector, unitVectors[unitVectorIndex]))
				crossProductZ += gClose * Math.abs(dotProduct2D(horizontalVector, unitVectors[unitVectorIndex]))
				if (crossProductZ > highestCrossProductZ) {
					highestCrossProductZ = crossProductZ
					otherVectorIndex = unitVectorIndex
				}
			}
		}
		var addition = getAddition2D(normalize2D(horizontalVector.slice(0)), normalize2D(unitVectors[otherVectorIndex].slice(0)))
		var multiplication = getMultiplication2D(multiply2DScalar(addition, -2.0 / lengthSquared2D(addition)), inset)
		bevelMap.set(pointIndex, add2D(points[pointIndex].slice(0), multiplication))
	}
	for (var pointIndex of bevelMap.keys()) {
		points[pointIndex] = bevelMap.get(pointIndex)
	}
}

function expandMesh(expansionBottom, expansionXY, expansionTop, matrix3D, mesh) {
	if (mesh == null) {
		return
	}
	if (expansionXY.length == 1) {
		expansionXY.push(expansionXY[0])
	}
	var facets = mesh.facets
	mesh.points = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), mesh.points)
	var directionMapZ = getDirectionMapZ(facets, mesh.points)
	var horizontalDirectionMap = directionMapZ.horizontalDirectionMap
	for (var key of horizontalDirectionMap.keys()) {
		add2D(mesh.points[key], getMultiplication2D(horizontalDirectionMap.get(key), expansionXY))
	}
	var bottomOverDeltaZ = expansionBottom / directionMapZ.deltaZ
	var topOverDeltaZ = expansionTop / directionMapZ.deltaZ
	var zAddition = - directionMapZ.minimumZ * topOverDeltaZ - directionMapZ.maximumZ * bottomOverDeltaZ
	var zMultiplier = topOverDeltaZ + bottomOverDeltaZ
	for (var point of mesh.points) {
		point[2] += point[2] * zMultiplier + zAddition
	}
	mesh.points = get3DsBy3DMatrix(matrix3D, mesh.points)
}

function getBoundedPoints2D(equations, points, polygons, registry, statement) {
	if (getIsEmpty(equations) && getIsEmpty(polygons)) {
		return points
	}
	var pointIndexSet = new Set()
	if (equations != null) {
		var variableMap = getVariableMapByStatement(statement)
		for (var equation of equations) {
			for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
				variableMap.set('point', points[pointIndex].toString())
				if (getValueByEquation(registry, statement, equation)) {
					pointIndexSet.add(pointIndex)
				}
			}
		}
	}
	if (polygons != null) {
		for (var polygon of polygons) {
			var boundingBox = getBoundingBox(polygon)
			for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
				var point = points[pointIndex]
				if (isPointInsideBoundingBoxOrClose(boundingBox, point)) {
					if (getIsPointInsidePolygonOrClose(point, polygon)) {
						pointIndexSet.add(pointIndex)
					}
				}
			}
		}
	}
	return getBoundedPointsBySet(pointIndexSet, points)
}

function getBoundedPointsBySet(pointIndexSet, points) {
	if (pointIndexSet.size == 0) {
		return null
	}
	var boundedPoints = []
	for (var pointIndex of pointIndexSet) {
		boundedPoints.push(points[pointIndex])
	}
	return boundedPoints
}

function getCenterDirection(registry, statement, tag) {
	var direction = getFloatsByDefault(undefined, 'direction', registry, statement, tag)
	return getCenterDirectionByCenterDirection(getFloatsByDefault(undefined, 'center', registry, statement, tag), direction)
}

function getCenterDirectionByCenterDirection(center, direction) {
	if (getIsEmpty(center) && getIsEmpty(direction)) {
		return null
	}
	if (getIsEmpty(center)) {
		center = [0.0, 0.0]
	}
	if (center.length == 1) {
		center.push(0.0)
	}
	center[0] = getValueByDefault(0.0, center[0])
	center[1] = getValueByDefault(0.0, center[1])
	if (getIsEmpty(direction)) {
		if (center[0] == 0.0 && center[1] == 0.0) {
			return {center:center, direction:[1.0, 0.0]}
		}
		return {center:center, direction:normalize2D([-center[1], center[0]])}
	}
	direction[0] = getValueByDefault(0.0, direction[0])
	if (direction.length == 1) {
		return {center:center, direction:getPolar(direction[0] * gRadiansPerDegree)}
	}
	direction[1] = getValueByDefault(0.0, direction[1])
	var directionLength = length2D(direction)
	if (directionLength == 0.0) {
		return {center:center, direction:[1.0, 0.0]}
	}
	return {center:center, direction:divide2DScalar(direction, directionLength)}
}

function getCenterDirectionMirrorStart(mirrorStart, points) {
	if (points.length < 2) {
		return {center:center, direction:[1.0, 0.0], mirrorStart:mirrorStart}
	}
	var penultimatePoint = points[points.length - 2]
	var ultimatePoint = points[points.length - 1]
	var direction = getSubtraction2D(ultimatePoint, penultimatePoint)
	direction = [direction[1], -direction[0]]
	perpendicular = multiply2DScalar(getAddition2D(penultimatePoint, ultimatePoint), 0.5)
	var directionLength = length2D(direction)
	if (directionLength == 0.0) {
		direction = [1.0, 0.0]
	}
	else {
		divide2DScalar(direction, directionLength)
	}
	return {center:perpendicular.slice(0), direction:direction.slice(0), mirrorStart:mirrorStart - 2}
}

function getDirectionMapZ(facets, points) {
	var horizontalDirectionMap = new Map()
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var normal = getNormalByFacet(facets[facetIndex], points)
		if (normal != null) {
			var facet = facets[facetIndex]
			for (var pointIndex of facet) {
				addElementToMapArray(normal, pointIndex, horizontalDirectionMap)
			}
		}
	}
	var minimumZ = Number.MAX_VALUE
	var maximumZ = -Number.MAX_VALUE
	for (var key of horizontalDirectionMap.keys()) {
		var z = points[key][2]
		minimumZ = Math.min(minimumZ, z)
		maximumZ = Math.max(maximumZ, z)
		var unitVectors = horizontalDirectionMap.get(key)
		unitVectors.sort(compareAbsoluteElementTwoAscending)
		var addition = getAddition2D(normalize2D(unitVectors[0]), normalize2D(unitVectors[1]))
		horizontalDirectionMap.set(key, multiply2DScalar(addition, 2.0 / lengthSquared2D(addition)))
	}
	return {deltaZ:maximumZ - minimumZ, horizontalDirectionMap:horizontalDirectionMap , minimumZ:minimumZ, maximumZ:maximumZ}
}

function getFilletedPolygon(numberOfSides, polygon, radius) {
	var filletedPolygon = []
	var minimumAngle = gDoublePi / numberOfSides
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		addFilletedPoints(filletedPolygon, minimumAngle, numberOfSides, polygon, radius, vertexIndex)
	}
	return filletedPolygon
}

function getFlatInterpolationAlongBeginEnd(x, points) {
	var beginPoint = points[0]
	if (points.length == 1) {
		return [0.0, points[0], points[0]]
	}
	if (x <= beginPoint[0]) {
		return [0.0, points[0], points[0]]
	}
	var upperIndex = points.length - 1
	if (x >= points[upperIndex][0]) {
		return [0.0, points[upperIndex], points[upperIndex]]
	}
	return getInsideInterpolationAlongBeginEnd(x, points)
}

function getInsideInterpolationAlongBeginEnd(x, points) {
	var lowerIndex = 0
	var upperIndex = points.length - 1
	for (var whileTestIndex = 0; whileTestIndex < gLengthLimit; whileTestIndex++) {
		var difference = upperIndex - lowerIndex
		if (difference < 2) {
			var lowerPoint = points[lowerIndex]
			var run = points[upperIndex][0] - lowerPoint[0]
			if (run == 0.0) {
				return [0.0, points[lowerIndex], points[lowerIndex]]
			}
			var along = (x - lowerPoint[0]) / run
			return [along, points[lowerIndex], points[upperIndex]]
		}
		var middleIndex = lowerIndex + Math.round(difference / 2)
		if (x < points[middleIndex][0]) {
			upperIndex = middleIndex
		}
		else {
			lowerIndex = middleIndex
		}
	}
	return null
}

function getOutsetPolygons(points, registry, statement) {
	var baseLocation = getFloatsByStatement('baseLocation', registry, statement)
	var checkIntersection = getBooleanByDefault(false, 'checkIntersection', registry, statement, this.name)
	var clockwise = getBooleanByStatement('clockwise', registry, statement)
	if (clockwise == null) {
		clockwise = getIsClockwise(points)
	}
	var markerAbsolute = getBooleanByDefault(true, 'markerAbsolute', registry, statement, this.name)
	var marker = getPointsByKey('marker', registry, statement)
	var baseMarker = getPointsByKey('baseMarker', registry, statement)
	var tipMarker = getPointsByKey('tipMarker', registry, statement)
	if (getIsEmpty(baseMarker)) {
		baseMarker = marker
	}
	if (getIsEmpty(tipMarker)) {
		tipMarker = marker
	}
	var outsets = getOutsets(registry, statement)
	return getOutsetPolygonsByDirection(baseLocation, baseMarker, checkIntersection, clockwise, markerAbsolute, outsets, points, tipMarker)
}

function getOutsets(registry, statement) {
	var outsets = getPointsByKey('outsets', registry, statement)
	if (getIsEmpty(outsets)) {
		var outset = getPointByDefault([1.0, 1.0], 'radius', registry, statement, this.name)
		outset = getPointByDefault(outset, 'outset', registry, statement, this.name)
		outsets = [outset]
	}
	else {
		for (var outset of outsets) {
			if (outset.length == 1) {
				outset.push(outset[0])
			}
		}
	}
	return outsets
}

function getPointIndexSet(boundaryEquations, ids, points, polygons, mesh, registry, statement, stratas) {
	var pointIndexSet = new Set()
	if (mesh.splitIndexesMap != undefined) {
		for (var id of ids) {
			if (mesh.splitIndexesMap.has(id)) {
				addElementsToSet(mesh.splitIndexesMap.get(id), pointIndexSet)
			}
		}
	}
	addTo3DPointIndexSet(boundaryEquations, pointIndexSet, points, polygons, registry, statement, stratas)
	return pointIndexSet
}

function getPointsExcept(points, registry, statement) {
	if (statement.attributeMap.has('alterations')) {
		var alterations = statement.attributeMap.get('alterations').split(',').filter(lengthCheck)
		for (var alteration of alterations) {
			if (gGetPointsMap.has(alteration)) {
				points = gGetPointsMap.get(alteration).getPoints(points, registry, statement)
			}
		}
	}
	return points
}

function mirrorByCenterDirectionRotation(centerDirection, point) {
	rotate2D(point, centerDirection.reverseRotation)
	point[1] = centerDirection.mirrorFromY - point[1]
	return rotate2D(point, centerDirection.direction)
}

function mirrorMesh(centerDirection, matrix3D, mesh) {
	addRotationToCenterDirection(centerDirection)
	mesh.points = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), mesh.points)
	for (var point of mesh.points) {
		mirrorByCenterDirectionRotation(centerDirection, point)
	}
	mesh.points = get3DsBy3DMatrix(matrix3D, mesh.points)
	for (var facet of mesh.facets) {
		facet.reverse()
	}
}

function setPointsExcept(points, registry, statement) {
	setPointsHD(getPointsExcept(points, registry, statement), statement)
}

function splitMesh(equations, id, matrix3D, mesh, polygons, registry, splitHeights, statement, stratas) {
	if (mesh == null || getIsEmpty(splitHeights)) {
		return
	}
	mesh.points = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), mesh.points)
	var facets = mesh.facets
	var points = mesh.points
	if (getIsEmpty(equations) && getIsEmpty(polygons)) {
		addSplitIndexes(id, splitHeights, mesh)
	}
	else {
		for (var splitHeight of splitHeights) {
			var facetIndexSet = new Set()
			if (equations != null) {
				var variableMap = getVariableMapByStatement(statement)
				for (var equation of equations) {
					for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
						var facet = facets[facetIndex]
						for (var pointIndex of facet) {
							variableMap.set('point', points[pointIndex].toString())
							if (getValueByEquation(registry, statement, equation)) {
								facetIndexSet.add(facetIndex)
								break
							}
						}
					}
				}
			}
			if (polygons != null) {
				for (var polygon of polygons) {
					for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
						if (getPolygonCrossesHeights(polygon, splitHeight, getPolygonByFacet(facets[facetIndex], points), stratas)) {
							facetIndexSet.add(facetIndex)
						}
					}
				}
			}
			addSplitIndexesByFacetSet(facetIndexSet, id, false, splitHeight, mesh)
		}
	}
	mesh.points = get3DsBy3DMatrix(matrix3D, mesh.points)
}
		
function splitMeshByBevels(boundaryEquations, id, matrix3D, mesh, polygons, registry, splitBevels, statement) {
	if (getIsEmpty(splitBevels)) {
		return
	}
	var splitHeights = []
	for (var splitBevel of splitBevels) {
		splitHeights.push(splitBevel[0])
	}
	splitMesh(boundaryEquations, id, matrix3D, mesh, polygons, registry, splitHeights, statement, null)
}

function taperMesh(matrix3D, maximumSpan, mesh, overhangAngle, sagAngle) {
	if (mesh == null) {
		return
	}
	var facets = mesh.facets
	if (facets.length == 0) {
		return
	}
	overhangAngle *= gRadiansPerDegree
	sagAngle *= gRadiansPerDegree
	var originalPoints = mesh.points
	var inversePoints = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), originalPoints)
	var highestFacetIndex = 0
	var highestFacetZ = -Number.MAX_VALUE
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var facet = facets[facetIndex]
		var minimumZ = Number.MAX_VALUE
		for (var pointIndex of facet) {
			minimumZ = Math.min(minimumZ, inversePoints[pointIndex][2])
		}
		if (minimumZ > highestFacetZ) {
			highestFacetZ = minimumZ
			highestFacetIndex = facetIndex
		}
	}
	var highestFacet = facets[highestFacetIndex].reverse()
	var highestPolygon = getPolygonByFacet(highestFacet, inversePoints)
	var maximumInset = getMaximumInset(highestPolygon)
	var sagSlope = -Math.tan(sagAngle)
	var overhangSlope = Math.tan(0.5 * Math.PI - overhangAngle)
	var approachRunOverRise = 1.0 / overhangSlope - 1.0 / sagSlope
	var inset = Math.max(maximumInset / approachRunOverRise, maximumInset - 0.5 * maximumSpan)
	var insetPolygon = getOutsetPolygon([-inset, -inset], highestPolygon)
	var height = overhangSlope * inset + highestFacetZ
	var insetFacet = new Array(highestFacet.length)
	var pointsLength = inversePoints.length
	pushArray(inversePoints, insetPolygon)
	for (var vertexIndex = 0; vertexIndex < highestFacet.length; vertexIndex++) {
		insetFacet[vertexIndex] = pointsLength
		inversePoints[pointsLength][2] = height
		pointsLength += 1
	}
	addFacetsByBottomTopFacet(highestFacet, facets, insetFacet)
	facets[highestFacetIndex] = insetFacet.reverse()
	pushArray(originalPoints, get3DsBy3DMatrix(matrix3D, inversePoints.slice(originalPoints.length, inversePoints.length)))
	mesh.points = originalPoints
}

function transformPoints2DByEquation(amplitudes, center, points, registry, statement, translationEquations, vector) {
	if (!getIsEmpty(translationEquations)) {
		for (var translationEquation of translationEquations) {
			var variableMap = getVariableMapByStatement(statement)
			for (var point of points) {
				variableMap.set('point', point.toString())
				var value = getValueByEquation(registry, statement, translationEquation)
				if (value != null) {
					if (Array.isArray(value)) {
						if (value.length == 1) {
							value.push(0.0)
						}
					}
					else {
						value = [value, 0.0]
					}
					add2D(point, value)
				}
			}
		}
	}
	if (getIsEmpty(amplitudes)) {
		return
	}
	if (getIsEmpty(center)) {
		center = [0.0, 0.0]
	}
	if (center.length == 1) {
		center.push(0.0)
	}
	if (getIsEmpty(vector)) {
		vector = [1.0, 0.0]
	}
	if (vector.length == 1) {
		vector.push(0.0)
	}
	normalize2D(vector)
	for (var point of points) {
		addInterpolationArrayXPolylineLength(dotProduct2D(vector, getSubtraction2D(point, center)), amplitudes, 2, point)
	}
}

function transformPoints3DByEquation(amplitudes, center, points, registry, statement, translationEquations, vector) {
	if (!getIsEmpty(translationEquations)) {
		for (var translationEquation of translationEquations) {
			var variableMap = getVariableMapByStatement(statement)
			for (var point of points) {
				variableMap.set('point', point.toString())
				var value = getValueByEquation(registry, statement, translationEquation)
				if (value != null) {
					if (Array.isArray(value)) {
						if (value.length < 2) {
							value.push(0.0)
						}
						if (value.length < 3) {
							value.push(0.0)
						}
					}
					else {
						value = [value, 0.0, 0.0]
					}
					add3D(point, value)
				}
			}
		}
	}
	if (getIsEmpty(amplitudes)) {
		return
	}
	if (getIsEmpty(center)) {
		center = [0.0, 0.0]
	}
	if (center.length == 1) {
		center.push(0.0)
	}
	if (center.length == 2) {
		center.push(0.0)
	}
	if (getIsEmpty(vector)) {
		vector = [1.0, 0.0, 0.0]
	}
	if (vector.length == 1) {
		vector.push(0.0)
	}
	if (vector.length == 2) {
		vector.push(0.0)
	}
	normalize3D(vector)
	for (var point of points) {
		addInterpolationArrayXPolylineLength(dotProduct3D(vector, getSubtraction3D(point, center)), amplitudes, 3, point)
	}
}

function wedgeMesh(inset, matrix3D, mesh) {
	if (mesh == null) {
		return
	}
	if (inset.length == 1) {
		inset = [inset[0], inset[0]]
	}
	var facets = mesh.facets
	mesh.points = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), mesh.points)
	var directionMapZ = getDirectionMapZ(facets, mesh.points)
	var horizontalDirectionMap = directionMapZ.horizontalDirectionMap
	var oneOverDeltaZ = 1.0 / directionMapZ.deltaZ
	for (var key of horizontalDirectionMap.keys()) {
		var centerPoint = mesh.points[key]
		var insetAtZ = getMultiplication2DScalar(inset, (directionMapZ.minimumZ - centerPoint[2]) * oneOverDeltaZ)
		mesh.points[key] = add2D(centerPoint.slice(0), getMultiplication2D(horizontalDirectionMap.get(key), insetAtZ))
	}
	mesh.points = get3DsBy3DMatrix(matrix3D, mesh.points)
}

var gBend = {
	alterMesh: function(mesh, registry, statement) {
		var boundaryEquations = getEquations('boundaryEquations', statement)
		var ids = []
		if (statement.attributeMap.has('splitIDs')) {
			ids = statement.attributeMap.get('splitIDs').split(' ').filter(lengthCheck)
		}
		var matrix3D = getChainMatrix3D(registry, statement)
		var points = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), mesh.points)
		var polygons = getPolygonsHDRecursively(registry, statement)
		var stratas = getStratas(registry, statement)
		var pointIndexSet = getPointIndexSet(boundaryEquations, ids, points, polygons, mesh, registry, statement, stratas)
		if (pointIndexSet.size == 0) {
			return
		}
		var boundedPoints = getBoundedPointsBySet(pointIndexSet, points)
		var amplitudes = getPointsByKey('amplitudes', registry, statement)
		var center = getFloatsByStatement('center', registry, statement)
		var translationEquations = getEquations('translations', statement)

//deprecated23
		deprecatedTranslationEquations = getEquations('translation', statement)
		if (deprecatedTranslationEquations != null) {
			translationEquations = getPushArray(translationEquations, deprecatedTranslationEquations)
		}

		var vector = get3DPointByStatement('vector', registry, statement)
		transformPoints3DByEquation(amplitudes, center, boundedPoints, registry, statement, translationEquations, vector)
		mesh.points = get3DsBy3DMatrix(matrix3D, points)
	},
	getPoints: function(points, registry, statement) {
		var boundaryEquations = getEquations('boundaryEquations', statement)
		var polygons = getPolygonsHDRecursively(registry, statement)
		var boundedPoints = getBoundedPoints2D(boundaryEquations, points, polygons, registry, statement)
		if (getIsEmpty(boundedPoints)) {
			return points
		}
		var amplitudes = getPointsByKey('amplitudes', registry, statement)
		var center = getFloatsByStatement('center', registry, statement)
		var translationEquations = getEquations('translations', statement)

//deprecated23
		deprecatedTranslationEquations = getEquations('translation', statement)
		if (deprecatedTranslationEquations != null) {
			translationEquations = getPushArray(translationEquations, deprecatedTranslationEquations)
		}

		var vector = get3DPointByStatement('vector', registry, statement)
		transformPoints2DByEquation(amplitudes, center, boundedPoints, registry, statement, translationEquations, vector)
		return points
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'bend',
	processStatement:function(registry, statement) {
		convertToGroupIfParent(statement)
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			this.alterMesh(workMesh, registry, statement)
			analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
			return
		}
		var points = getPointsHD(registry, statement)
		if (points == null) {
			noticeByList(['No work mesh or points could be found for bend in alteration.', statement])
			return
		}
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gBevel = {
	alterMesh: function(mesh, registry, statement) {
		var bevels = getPointsByKey('bevels', registry, statement)
		var boundaryEquations = getEquations('boundaryEquations', statement)
		var ids = []
		if (statement.attributeMap.has('splitIDs')) {
			ids = statement.attributeMap.get('splitIDs').split(' ').filter(lengthCheck)
		}
		var matrix3D = getChainMatrix3D(registry, statement)
		var points = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), mesh.points)
		var polygons = getPolygonsHDRecursively(registry, statement)
		var splitBevels = getPointsByKey('splitBevels', registry, statement)
		var stratas = getStratas(registry, statement)
		splitMeshByBevels(boundaryEquations, statement.attributeMap.get('id'), matrix3D, mesh, polygons, registry, splitBevels, stratas)
		var pointIndexSet = getPointIndexSet(boundaryEquations, ids, points, polygons, mesh, registry, statement, stratas)
		if (pointIndexSet.size == 0) {
			return
		}
		bevelPoints(bevels, matrix3D, mesh, pointIndexSet, points, splitBevels)
		mesh.points = get3DsBy3DMatrix(matrix3D, points)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'bevel',
	processStatement:function(registry, statement) {
		statement.tag = 'g'
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			noticeByList(['No work mesh could be found for bevel in alteration.', statement])
			return
		}
		this.alterMesh(workMesh, registry, statement)
		analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
	}
}

var gExpand = {
	alterMesh: function(mesh, registry, statement) {
		var matrix3D = getChainMatrix3D(registry, statement)
		var expansionXY = getFloatsByDefault([1.0], 'expansionXY', registry, statement, this.name)

//deprecated
		var expansionZ = getFloatByDefault(0.0, 'expansionZ', registry, statement, this.name)

		var expansionBottom = getFloatByDefault(0.0, 'expansionBottom', registry, statement, this.name)
		var expansionTop = getFloatByDefault(expansionZ, 'expansionTop', registry, statement, this.name)
		expandMesh(expansionBottom, expansionXY, expansionTop, matrix3D, mesh)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'expand',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			noticeByList(['No work mesh could be found for expand in alteration.', statement])
			return
		}
		this.alterMesh(workMesh, registry, statement)
		analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
	}
}

var gFillet = {
	getPoints: function(points, registry, statement) {
		var numberOfSides = getFloatByDefault(12, 'sides', registry, statement, this.name)
		var radius = getFloatByDefault(1.0, 'radius', registry, statement, this.name)
		return getFilletedPolygon(numberOfSides, points, radius)
	},
	initialize: function() {
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'fillet',
	processStatement:function(registry, statement) {
		var points = getPointsHD(registry, statement)
		if (points == null) {
			noticeByList(['No points could be found for fillet in alteration.', statement])
			return
		}
		statement.tag = 'polygon'
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gMirror = {
	alterMesh: function(mesh, registry, statement) {
		var centerDirection = getCenterDirection(registry, statement, 'mirror')
		if (centerDirection == null) {
			return
		}
		mirrorMesh(centerDirection, getChainMatrix3D(registry, statement), mesh)
	},
	getPoints: function(points, registry, statement) {
		var centerDirection = getCenterDirection(registry, statement, 'mirror')
		if (centerDirection != null) {
			addRotationToCenterDirection(centerDirection)
			for (var point of points) {
				mirrorByCenterDirectionRotation(centerDirection, point)
			}
			points.reverse()
		}
		return points
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'mirror',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			this.alterMesh(workMesh, registry, statement)
			analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
			return
		}
		var points = getPointsHD(registry, statement)
		if (points == null) {
			noticeByList(['No work mesh or points could be found for mirror in alteration.', statement])
			return
		}
		statement.tag = getValueByKeyDefault('polygon', 'tag', registry, statement, this.name)
		var centerDirection = getCenterDirection(registry, statement, this.name)
		var mirrorStart = points.length - 1
		if (centerDirection == null) {
			centerDirection = getCenterDirectionMirrorStart(mirrorStart, points)
			mirrorStart = centerDirection.mirrorStart
		}
		addRotationToCenterDirection(centerDirection)
		var pointZero = points[0]
		var pointStart = points[mirrorStart]
		if (distanceSquared2D(pointStart, mirrorByCenterDirectionRotation(centerDirection, pointStart.slice(0))) < gCloseSquared) {
			mirrorStart -= 1
		}
		for (var pointIndex = mirrorStart; pointIndex > -1; pointIndex--) {
			var mirrorPoint = mirrorByCenterDirectionRotation(centerDirection, points[pointIndex].slice(0))
			if (distanceSquared2D(pointZero, mirrorPoint) < gCloseSquared) {
				break
			}
			points.push(mirrorPoint)
		}
		setPointsExcept(points, registry, statement)
	}
}

var gMirrorJoin = {
	alterMesh: function(mesh, registry, statement) {
		var centerDirection = getCenterDirection(registry, statement, 'mirrorJoin')
		if (centerDirection == null) {
			return
		}
//		polygonateMesh(mesh)
		var mirroredMesh = getMeshCopy(mesh)
		mirrorMesh(centerDirection, getChainMatrix3D(registry, statement), mirroredMesh)
		var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
		joinMeshes(null, null, [mesh, mirroredMesh])
	},
	getPoints: function(points, registry, statement) {
		var centerDirection = getCenterDirection(registry, statement, 'mirrorJoin')
		if (centerDirection != null) {
			addRotationToCenterDirection(centerDirection)
			for (var point of points) {
				mirrorByCenterDirectionRotation(centerDirection, point)
			}
			points.reverse()
		}
		return points
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'mirrorJoin',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			this.alterMesh(workMesh, registry, statement)
			analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
			return
		}
		var points = getPointsHD(registry, statement)
		if (points == null) {
			noticeByList(['No work mesh or points could be found for mirrorJoin in alteration.', statement])
			return
		}
		statement.tag = getValueByKeyDefault('polygon', 'tag', registry, statement, this.name)
		var centerDirection = getCenterDirection(registry, statement, this.name)
		var mirrorStart = points.length - 1
		if (centerDirection == null) {
			centerDirection = getCenterDirectionMirrorStart(mirrorStart, points)
			mirrorStart = centerDirection.mirrorStart
		}
		addRotationToCenterDirection(centerDirection)
		var pointZero = points[0]
		var pointStart = points[mirrorStart]
		if (distanceSquared2D(pointStart, mirrorByCenterDirectionRotation(centerDirection, pointStart.slice(0))) < gCloseSquared) {
			mirrorStart -= 1
		}
		for (var pointIndex = mirrorStart; pointIndex > -1; pointIndex--) {
			var mirrorPoint = mirrorByCenterDirectionRotation(centerDirection, points[pointIndex].slice(0))
			if (distanceSquared2D(pointZero, mirrorPoint) < gCloseSquared) {
				break
			}
			points.push(mirrorPoint)
		}
		setPointsExcept(points, registry, statement)
	}
}

var gMove = {
	alterMesh: function(mesh, registry, statement) {
		var matrix3D = getChainMatrix3D(registry, statement)
		mesh.points = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), mesh.points)
		var rotation = getFloatsByStatement('rotation', registry, statement)
		if (!getIsEmpty(rotation)) {
			if (rotation.length == 1) {
				rotation = getPolar(rotation[0] * gRadiansPerDegree)
			}
			var rotationLength = length2D(rotation)
			if (rotationLength != 0.0) {
				divide2DScalar(rotation, rotationLength)
				for (var point of mesh.points) {
					rotate2D(point, rotation)
				}
			}
		}
		var boundingBox = getMeshBoundingBox(mesh)
		var lowerLeft = getFloatsByStatement('lowerLeft', registry, statement)
		if (getIsEmpty(lowerLeft)) {
			var center = getFloatsByStatement('center', registry, statement)
			var dimensions2D = getSubtraction2D(boundingBox[1], boundingBox[0])
			if (getIsEmpty(center)) {
				var bedSize = getFloatsByStatement('bedSize', registry, statement)
				if (!getIsEmpty(bedSize)) {
					if (bedSize.length == 1) {
						bedSize.push(bedSize[0])
					}
					if (dimensions2D[0] > bedSize[0] || dimensions2D[1] > bedSize[1]) {
						warningByList(['The mesh is bigger than the bed.', statement, dimensions2D, bedSize])
					}
					center = getMultiplication2DScalar(bedSize, 0.5)
				}
			}
			if (!getIsEmpty(center)) {
				multiply2DScalar(dimensions2D, 0.5)
				lowerLeft = getSubtraction2D(center, dimensions2D)
			}
		}
		if (!getIsEmpty(lowerLeft)) {
			if (lowerLeft.length == 1) {
				lowerLeft.push(lowerLeft[0])
			}
			if (lowerLeft.length == 2) {
				lowerLeft.push(0.0)
			}
			add3Ds(mesh.points, getSubtraction3D(lowerLeft, boundingBox[0]))
			statement.attributeMap.set('lowerLeft', lowerLeft.toString())
		}
		statement.attributeMap.set('boundingBox', getMeshBoundingBox(mesh).toString())
		mesh.points = get3DsBy3DMatrix(matrix3D, mesh.points)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'move',
	processStatement: function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			noticeByList(['No work mesh could be found for move in alteration.', statement])
			return
		}
		this.alterMesh(workMesh, registry, statement)
		analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
	}
}

var gOutset = {
	getPoints: function(points, registry, statement) {
		var outsetPolygons = getOutsetPolygons(points, registry, statement)
		if (outsetPolygons.length == 0) {
			return []
		}
		return outsetPolygons[0]
	},
	initialize: function() {
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'outset',
	processStatement:function(registry, statement) {
		var points = getPointsHD(registry, statement)
		if (points == null) {
			noticeByList(['No points could be found for outset in alteration.', statement])
			return
		}
		statement.tag = 'polygon'
		var outsetPolygons = getOutsetPolygons(points, registry, statement)
		if (getIsEmpty(outsetPolygons)) {
			setPointsExcept([], registry, statement)
			return
		}
		if (outsetPolygons.length == 1) {
			setPointsExcept(outsetPolygons[0], registry, statement)
			return
		}
		convertToGroup(statement)
		addPolygonsToGroup(outsetPolygons, registry, statement)
	}
}

var gPolygonate = {
	alterMesh: function(mesh, registry, statement) {
		polygonateMesh(mesh)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'polygonate',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			noticeByList(['No work mesh could be found for polygonate in alteration.', statement])
			return
		}
		this.alterMesh(workMesh, registry, statement)
		analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
	}
}

var gReverse = {
	getPoints: function(points, registry, statement) {
		return getArraysCopy(points).reverse()
	},
	initialize: function() {
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'reverse',
	processStatement:function(registry, statement) {
		var points = getPointsHD(registry, statement)
		if (points == null) {
			noticeByList(['No points could be found for reverse in alteration.', statement])
			return
		}
		statement.tag = 'polygon'
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement)
	}
}

var gSplit = {
	alterMesh: function(mesh, registry, statement) {
		var equations = getEquations('boundary', statement)
		var matrix3D = getChainMatrix3D(registry, statement)
		var polygons = getPolygonsHDRecursively(registry, statement)
		var splitHeights = getFloatsByStatement('splitHeights', registry, statement)
		var stratas = getStratas(registry, statement)
		splitMesh(equations, statement.attributeMap.get('id'), matrix3D, mesh, polygons, registry, splitHeights, statement, stratas)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'split',
	processStatement:function(registry, statement) {
		convertToGroupIfParent(statement)
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			this.alterMesh(workMesh, registry, statement)
			analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
			return
		}
		var polygons = getChainPointListsHDRecursivelyDelete(registry, statement, 'polygon')
		if (getIsEmpty(polygons)) {
			noticeByList(['No work mesh or polygons could be found for split in alteration.', statement])
			return
		}
		var splitHeights = getFloatsByStatement('splitHeights', registry, statement)
		addSplitPolygonsByHeights(polygons, splitHeights)
		addPolygonsToGroup(polygons, registry, statement)
	}
}

var gTaper = {
	alterMesh: function(mesh, registry, statement) {
		var matrix3D = getChainMatrix3D(registry, statement)
		var maximumSpan = getFloatByDefault(1.0, 'maximumSpan', registry, statement, this.name)
		var overhangAngle = getFloatByDefault(40.0, 'overhangAngle', registry, statement, this.name)
		var sagAngle = getFloatByDefault(15.0, 'sagAngle', registry, statement, this.name)
		taperMesh(matrix3D, maximumSpan, mesh, overhangAngle, sagAngle)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'taper',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			noticeByList(['No work mesh could be found for taper in alteration.', statement])
			return
		}
		this.alterMesh(workMesh, registry, statement)
		analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
	}
}

var gTriangulate = {
	alterMesh: function(mesh, registry, statement) {
		mesh.facets = getAllTriangleFacets(mesh)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'triangulate',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			this.alterMesh(workMesh, registry, statement)
			analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
			return
		}
		var polygons = getChainPointListsHDRecursivelyDelete(registry, statement, 'polygon')
		if (getIsEmpty(polygons)) {
			noticeByList(['No work mesh or polygons could be found for triangulate in alteration.', statement])
			return
		}
		var triangulatedPolygons = get3DTriangulatedPolygons(polygons)
		if (getIsEmpty(triangulatedPolygons)) {
			noticeByList(['No triangulatedPolygons could be found for triangulate in alteration.', statement])
		}
		else{
			convertToGroup(statement)
			addPolygonsToGroup(triangulatedPolygons, registry, statement)
		}
	}
}

var gWedge = {
	alterMesh: function(mesh, registry, statement) {
		var inset = getPointByDefault([1.0, 1.0], 'inset', registry, statement, this.name)
		var matrix3D = getChainMatrix3D(registry, statement)
		wedgeMesh(inset, matrix3D, mesh)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'wedge',
	processStatement:function(registry, statement) {
		statement.tag = 'g'
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			this.alterMesh(workMesh, registry, statement)
			analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
			return
		}
		var polygons = getPolygonsHDRecursively(registry, statement)
		if (getIsEmpty(polygons)) {
			noticeByList(['No work mesh or polygons could be found for wedge in alteration.', statement])
			return
		}
		var heights = getHeights(registry, statement, this.name)
		var matrix3D = getChainMatrix3D(registry, statement)
		var pillarMesh = getPillarMesh(heights, matrix3D, polygons)
		this.alterMesh(pillarMesh, registry, statement)
		analyzeOutputMesh(pillarMesh, registry, statement)
	}
}

var gAlterationProcessors = [
gBend, gBevel, gExpand, gFillet, gMirror, gMirrorJoin, gMove, gOutset, gPolygonate, gReverse, gSplit, gTaper, gTriangulate, gWedge]
var gAlterMeshMap = new Map()
var gGetPointsMap = new Map()
