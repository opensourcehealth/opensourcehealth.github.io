//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addFillet(filletCenter, filletRotation, filletStart, numberOfFilletSides, points) {
	points.push(add2D(filletCenter.slice(0), filletStart))
	for (var filletIndex = 1; filletIndex < numberOfFilletSides; filletIndex++) {
		filletStart = get2DRotation(filletStart, filletRotation)
		points.push(add2D(filletCenter.slice(0), filletStart))
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
			var midpoint = multiply2DByScalar(get2DAddition(beginMeeting.point, endMeeting.point), 0.5)
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

//deprecated
function alterMeshExcept(mesh, registry, statement, tag) {
	if (statement.attributeMap.has('alterations')) {
		var alterations = statement.attributeMap.get('alterations').split(',').filter(lengthCheck)
		for (var alteration of alterations) {
			alteration = alteration.trim()
			if (alteration != tag) {
				if (gAlterMeshMap.has(alteration)) {
					gAlterMeshMap.get(alteration).alterMesh(mesh, registry, statement)
				}
			}
		}
	}
}

//deprecated
function analyzeOutputMesh(mesh, registry, statement) {
	var attributeMap = statement.attributeMap
	var id = attributeMap.get('id')
	registry.meshMap.set(id, mesh)
	alterMeshExcept(mesh, registry, statement, statement.tag)
	var date = getNullOrValue('date', registry.storageMap)
	var project = getNullOrValue('project', registry.storageMap)
	if (attributeMap.has('outputMesh')) {
		addToMeshArea(id, getMeshString(date, attributeMap.get('outputMesh'), id, mesh, project))
	}
	if (attributeMap.has('outputTriangleMesh')) {
		addToMeshArea(id, getTriangleMeshString(date, attributeMap.get('outputTriangleMesh'), id, mesh, project))
	}
	if (attributeMap.has('view')) {
		if (getBooleanByStatementValue('view', registry, statement, attributeMap.get('view'))) {
			meshViewer.addMesh(id, null)
		}
	}
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
			bevel.push(0.0)
		}
		if (bevel.length == 2) {
			bevel.push(bevel[1])
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
		var lower = bevels[interpolationAlong[1]]
		var upper = bevels[interpolationAlong[2]]
		var oneMinus = 1.0 - along
		var inset = [oneMinus * lower[1] + along * upper[1], oneMinus * lower[2] + along * upper[2]]
		var unitVectors = horizontalDirectionMap.get(pointIndex)
		unitVectors.sort(compareAbsoluteElementTwoAscending)
		var addition = get2DAddition(normalize2D(unitVectors[0]), normalize2D(unitVectors[1]))
		var multiplication = get2DMultiplication(multiply2DByScalar(addition, -2.0 / get2DLengthSquared(addition)), inset)
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
		add2D(mesh.points[key], get2DMultiplication(horizontalDirectionMap.get(key), expansionXY))
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

function getCenterDirection(registry, statement) {
	var center = getFloatsByStatement('center', registry, statement)
	var direction = getFloatsByStatement('direction', registry, statement)
	if (center == null && direction == null) {
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
		var angle = direction[0] * gRadiansPerDegree
		return {center:center, direction:[Math.cos(angle), -Math.sin(angle)]}
	}
	direction[1] = getValueByDefault(0.0, direction[1])
	var directionLength = get2DLength(direction)
	if (directionLength == 0.0) {
		return {center:center, direction:[1.0, 0.0]}
	}
	return {center:center, direction:divide2DByScalar(direction, directionLength)}
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
		var addition = get2DAddition(normalize2D(unitVectors[0]), normalize2D(unitVectors[1]))
		horizontalDirectionMap.set(key, multiply2DByScalar(addition, 2.0 / get2DLengthSquared(addition)))
	}
	return {deltaZ:maximumZ - minimumZ, horizontalDirectionMap:horizontalDirectionMap , minimumZ:minimumZ, maximumZ:maximumZ}
}

function getFilletedPolygon(numberOfSides, polygon, radius) {
	var filletedPolygon = []
	var maximumAngle = gDoublePi / numberOfSides
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var beginPoint = polygon[(vertexIndex - 1 + polygon.length) % polygon.length]
		var centerPoint = polygon[vertexIndex]
		var endPoint = polygon[(vertexIndex + 1) % polygon.length]
		var centerBegin = get2DSubtraction(beginPoint, centerPoint)
		var centerBeginLength = get2DLength(centerBegin)
		var centerEnd = get2DSubtraction(endPoint, centerPoint)
		var centerEndLength = get2DLength(centerEnd)
		var minimumLength = 0.5 * Math.min(centerBeginLength, centerEndLength)
		divide2DByScalar(centerBegin, centerBeginLength)
		divide2DByScalar(centerEnd, centerEndLength)
		var rotatedEnd = get2DRotation(centerEnd, [-centerBegin[0], centerBegin[1]])
		var cornerAngle = Math.atan2(rotatedEnd[1], rotatedEnd[0])
		var numberOfFilletSides = Math.ceil(Math.abs(cornerAngle) / maximumAngle - gClose)
		if (numberOfFilletSides < 2) {
			filletedPolygon.push(centerPoint)
		}
		else {
			var centerVector = normalize2D(get2DAddition(centerBegin, centerEnd))
			var dotProduct = get2DDotProduct(centerVector, centerBegin)
			var filletRadius = radius
			var perpendicular = Math.sqrt(1.0 - dotProduct * dotProduct)
			var distanceToTangent = radius * dotProduct / perpendicular
			var filletRadius = radius
			if (distanceToTangent > minimumLength) {
				var lengthRatio = minimumLength / distanceToTangent
				filletRadius *= lengthRatio
				distanceToTangent *= lengthRatio
				numberOfFilletSides = Math.max(2, Math.ceil(Math.sqrt(lengthRatio) * Math.abs(cornerAngle) / maximumAngle - gClose))
			}
			var beginTangent = get2DAddition(centerPoint, get2DMultiplicationByScalar(centerBegin, distanceToTangent))
			var endTangent = get2DAddition(centerPoint, get2DMultiplicationByScalar(centerEnd, distanceToTangent))
			var distanceToFilletCenter = filletRadius / perpendicular
			var filletCenter = add2D(centerPoint.slice(0), get2DMultiplicationByScalar(centerVector, distanceToFilletCenter))
			var filletAngle = -cornerAngle / numberOfFilletSides
			var filletRotation = get2DPolar(filletAngle)
			var halfAngleRotation = get2DPolar(0.5 * filletAngle)
			var beginTangentFilletCenter = get2DRotation(get2DSubtraction(beginTangent, filletCenter), halfAngleRotation)
			var filletStart = divide2DByScalar(beginTangentFilletCenter, halfAngleRotation[0])
			addFillet(filletCenter, filletRotation, filletStart, numberOfFilletSides, filletedPolygon)
		}
	}
	return filletedPolygon
}

function getFlatInterpolationAlongBeginEnd(x, points) {
	var beginPoint = points[0]
	if (points.length == 1) {
		return [0.0, 0, 0]
	}
	if (x <= beginPoint[0]) {
		return [0.0, 0, 0]
	}
	var upperIndex = points.length - 1
	if (x >= points[upperIndex][0]) {
		return [0.0, upperIndex, upperIndex]
	}
	return getInsideInterpolationAlongBeginEnd(x, points)
}

/*
deprecated23
function getInterpolationAlongBeginEnd(x, points) {
	var beginPoint = points[0]
	if (points.length == 1) {
		return [0.0, 0, 0]
	}
	var beginPointX = beginPoint[0]
	if (x <= beginPointX) {
		var run = points[1][0] - beginPointX
		if (run == 0.0) {
			return [0.0, 0, 0]
		}
		var along = (x - beginPointX) / run
		return [along, 0, 1]
	}
	var upperIndex = points.length - 1
	var endPoint = points[upperIndex]
	var endPointX = endPoint[0]
	if (x >= endPointX) {
		var run = endPointX - points[points.length - 2][0]
		if (run == 0.0) {
			return [0.0, upperIndex, 0]
		}
		var along = (endPointX - x) / run
		return [along, upperIndex, points.length - 2]
	}
	return getInsideInterpolationAlongBeginEnd(x, points)
}
*/

function getInsideInterpolationAlongBeginEnd(x, points) {
	var lowerIndex = 0
	var upperIndex = points.length - 1
	for (var whileTestIndex = 0; whileTestIndex < gLengthLimit; whileTestIndex++) {
		var difference = upperIndex - lowerIndex
		if (difference < 2) {
			var lowerPoint = points[lowerIndex]
			var run = points[upperIndex][0] - lowerPoint[0]
			if (run == 0.0) {
				return [0.0, lowerIndex, lowerIndex]
			}
			var along = (x - lowerPoint[0]) / run
			return [along, lowerIndex, upperIndex]
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

function getPointsExcept(points, registry, statement, tag) {
	if (statement.attributeMap.has('alterations')) {
		var alterations = statement.attributeMap.get('alterations').split(',').filter(lengthCheck)
		for (var alteration of alterations) {
			if (alteration != tag) {
				if (gGetPointsMap.has(alteration)) {
					points = gGetPointsMap.get(alteration).getPoints(points, registry, statement)
				}
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

function setPointsExcept(points, registry, statement, tag) {
	setPointsHD(getPointsExcept(points, registry, statement, tag), statement)
}

function splitMesh(equations, id, matrix3D, mesh, polygons, registry, splitHeights, statement) {
	if (mesh == null || getIsEmpty(splitHeights)) {
		return
	}
	mesh.points = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), mesh.points)
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
					for (var facetIndex = 0; facetIndex < mesh.facets.length; facetIndex++) {
						var facet = mesh.facets[facetIndex]
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
					for (var facetIndex = 0; facetIndex < mesh.facets.length; facetIndex++) {
						if (getPolygonCrossesHeightsPolygon(polygon, splitHeight, getPolygonByFacet(mesh.facets[facetIndex], points))) {
							facetIndexSet.add(facetIndex)
						}
					}
				}
			}
			addSplitIndexesByFacetSet(facetIndexSet, id, splitHeight, mesh)
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
	splitMesh(boundaryEquations, id, matrix3D, mesh, polygons, registry, splitHeights, statement)
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

function transformPoints2DByEquation(amplitudes, basis2D, center, points, registry, statement, translationEquations) {
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
	if (getIsEmpty(basis2D)) {
		basis2D = [1.0, 0.0]
	}
	if (basis2D.length == 1) {
		basis2D.push(0.0)
	}
	var basis2DLength = get2DLength(basis2D)
	if (basis2DLength == 0.0) {
		return
	}
	divide2DByScalar(basis2D, basis2DLength)
	var basis2Ds = [basis2D, [-basis2D[1], basis2D[0]]]
	if (getIsEmpty(center)) {
		center = [0.0, 0.0]
	}
	if (center.length == 1) {
		center.push(0.0)
	}
	for (var point of points) {
		var centerPoint = get2DSubtraction(point, center)
		var vectorProjection = get2DDotProduct(basis2D, centerPoint)
		var interpolationAlong = getFlatInterpolationAlongBeginEnd(vectorProjection, amplitudes)
		var along = interpolationAlong[0]
		var oneMinus = 1.0 - along
		var lowerAmplitude = amplitudes[interpolationAlong[1]]
		var upperAmplitude = amplitudes[interpolationAlong[2]]
		var minimumAmplitudeLength = Math.min(lowerAmplitude.length, upperAmplitude.length)
		for (var dimensionIndex = 1; dimensionIndex < minimumAmplitudeLength; dimensionIndex++) {
			var interpolation = oneMinus * lowerAmplitude[dimensionIndex] + along * upperAmplitude[dimensionIndex]
			add2D(point, get2DMultiplicationByScalar(basis2Ds[dimensionIndex % 2], interpolation))
		}
	}
}

function transformPoints3DByEquation(amplitudes, basis3Ds, center, points, registry, statement, translationEquations) {
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
	if (getIsEmpty(basis3Ds)) {
		basis3Ds = [[1.0, 0.0, 0.0]]
	}
	var basis3DXLength = get3DLength(basis3Ds[0])
	if (basis3DXLength == 0.0) {
		return
	}
	divide2DByScalar(basis3Ds[0], basis3DXLength)
	if (basis3Ds.length == 1) {
		var basis3DY = [-basis3Ds[0][1], basis3Ds[0][0], 0.0]
		normalize2D(basis3DY)
		basis3Ds.push(basis3DY)
	}
	
	if (basis3Ds.length == 2) {
		var basis3DZ = getCrossProduct(basis3Ds[0], basis3Ds[1])
		normalize3D(basis3DZ)
		basis3Ds.push(basis3DZ)
	}
	if (getIsEmpty(center)) {
		center = [0.0, 0.0]
	}
	if (center.length == 1) {
		center.push(0.0)
	}
	for (var point of points) {
		var centerPoint = get2DSubtraction(point, center)
		var vectorProjection = get2DDotProduct(basis3Ds[0], centerPoint)
		var interpolationAlong = getFlatInterpolationAlongBeginEnd(vectorProjection, amplitudes)
		var along = interpolationAlong[0]
		var oneMinus = 1.0 - along
		var lowerAmplitude = amplitudes[interpolationAlong[1]]
		var upperAmplitude = amplitudes[interpolationAlong[2]]
		var minimumAmplitudeLength = Math.min(lowerAmplitude.length, upperAmplitude.length)
		for (var dimensionIndex = 1; dimensionIndex < minimumAmplitudeLength; dimensionIndex++) {
			var interpolation = oneMinus * lowerAmplitude[dimensionIndex] + along * upperAmplitude[dimensionIndex]
			add3D(point, get3DMultiplicationByScalar(basis3Ds[dimensionIndex % 3], interpolation))
		}
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
		var insetAtZ = get2DMultiplicationByScalar(inset, (directionMapZ.minimumZ - centerPoint[2]) * oneOverDeltaZ)
		mesh.points[key] = add2D(centerPoint.slice(0), get2DMultiplication(horizontalDirectionMap.get(key), insetAtZ))
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
		var basis3Ds = getFloatListsByStatement('basis3Ds', registry, statement)
		var center = getFloatsByStatement('center', registry, statement)
		var translationEquations = getEquations('translations', statement)

//deprecated23
		deprecatedTranslationEquations = getEquations('translation', statement)
		if (deprecatedTranslationEquations != null) {
			translationEquations = getPushArray(translationEquations, deprecatedTranslationEquations)
		}

		transformPoints3DByEquation(amplitudes, basis3Ds, center, boundedPoints, registry, statement, translationEquations)
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
		var basis2D = getFloatsByStatement('basis2D', registry, statement)
		var center = getFloatsByStatement('center', registry, statement)
		var translationEquations = getEquations('translations', statement)

//deprecated23
		deprecatedTranslationEquations = getEquations('translation', statement)
		if (deprecatedTranslationEquations != null) {
			translationEquations = getPushArray(translationEquations, deprecatedTranslationEquations)
		}

		transformPoints2DByEquation(amplitudes, basis2D, center, boundedPoints, registry, statement, translationEquations)
		return points
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'bend',
	processStatement:function(registry, statement) {
		statement.tag = 'g'
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
		setPointsExcept(points, registry, statement, this.name)
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
		var inset = getFloatByDefault(1.0, 'inset', registry, statement, this.name)
		return getFilletedPolygon(numberOfSides, points, inset)
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
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gMirror = {
	alterMesh: function(mesh, registry, statement) {
		var centerDirection = getCenterDirection(registry, statement)
		if (centerDirection == null) {
			return
		}
		addRotationToCenterDirection(centerDirection)
		var matrix3D = getChainMatrix3D(registry, statement)
		mesh.points = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), mesh.points)
		for (var point of mesh.points) {
			mirrorByCenterDirectionRotation(centerDirection, point)
		}
		mesh.points = get3DsBy3DMatrix(matrix3D, mesh.points)
		for (var facet of mesh.facets) {
			facet.reverse()
		}
	},
	getPoints: function(points, registry, statement) {
		var centerDirection = getCenterDirection(registry, statement)
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
		var points = getPointsHD(registry, statement)
		if (getIsEmpty(points)) {
			noticeByList(['No points could be found for mirror in alteration.', statement])
			return
		}
		statement.tag = getValueByKeyDefault('polygon', 'tag', registry, statement, this.name)
		var centerDirection = getCenterDirection(registry, statement)
		var mirrorStart = points.length - 1
		if (centerDirection == null) {
			if (points.length < 2) {
				centerDirection = {center:center, direction:[1.0, 0.0]}
			}
			else {
				var penultimatePoint = points[points.length - 2]
				var ultimatePoint = points[points.length - 1]
				direction = get2DSubtraction(ultimatePoint, penultimatePoint)
				direction = [direction[1], -direction[0]]
				perpendicular = multiply2DByScalar(get2DAddition(penultimatePoint, ultimatePoint), 0.5)
				mirrorStart -= 2
				var directionLength = get2DLength(direction)
				if (directionLength == 0.0) {
					direction = [1.0, 0.0]
				}
				else {
					divide2DByScalar(direction, directionLength)
				}
				centerDirection = {center:perpendicular.slice(0), direction:direction.slice(0)}
			}
		}
		addRotationToCenterDirection(centerDirection)
		var pointZero = points[0]
		var pointStart = points[mirrorStart]
		if (get2DDistanceSquared(pointStart, mirrorByCenterDirectionRotation(centerDirection, pointStart.slice(0))) < gCloseSquared) {
			mirrorStart -= 1
		}
		for (var pointIndex = mirrorStart; pointIndex > -1; pointIndex--) {
			var mirrorPoint = mirrorByCenterDirectionRotation(centerDirection, points[pointIndex].slice(0))
			if (get2DDistanceSquared(pointZero, mirrorPoint) < gCloseSquared) {
				break
			}
			points.push(mirrorPoint)
		}
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gOutset = {
	getPoints: function(points, registry, statement) {
		var baseLocation = getFloatsByStatement('baseLocation', registry, statement)
		var checkIntersection = getBooleanByDefault(false, 'checkIntersection', registry, statement, this.name)
		var clockwise = getBooleanByDefault(getIsClockwise(points), 'clockwise', registry, statement, this.name)
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
		if (checkIntersection) {
			if (outsets[0][0] < 0.0) {
				clockwise = !clockwise
				multiply2DByScalar(outset, -1)
			}
		}
		var outsets = getOutsets(registry, statement)
		var outsetPolygons =
		getOutsetPolygonsByDirection(baseLocation, baseMarker, checkIntersection, clockwise, markerAbsolute, outsets, points, tipMarker)
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
		var baseLocation = getFloatsByStatement('baseLocation', registry, statement)
		var checkIntersection = getBooleanByDefault(false, 'checkIntersection', registry, statement, this.name)
		var clockwise = getBooleanByDefault(getIsClockwise(points), 'clockwise', registry, statement, this.name)
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
		var outsetPolygons =
		getOutsetPolygonsByDirection(baseLocation, baseMarker, checkIntersection, clockwise, markerAbsolute, outsets, points, tipMarker)
		if (getIsEmpty(outsetPolygons)) {
			setPointsExcept([], registry, statement, this.name)
			return
		}
		if (outsetPolygons.length == 1) {
			setPointsExcept(outsetPolygons[0], registry, statement, this.name)
		}
		convertToGroup(statement)
		addPolygonsToGroup(outsetPolygons, registry, statement)
	}
}

var gSplit = {
	alterMesh: function(mesh, registry, statement) {
		var equations = getEquations('boundary', statement)
		var matrix3D = getChainMatrix3D(registry, statement)
		var polygons = getPolygonsHDRecursively(registry, statement)
		var splitHeights = getFloatsByStatement('splitHeights', registry, statement)
		splitMesh(equations, statement.attributeMap.get('id'), matrix3D, mesh, polygons, registry, splitHeights, statement)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'split',
	processStatement:function(registry, statement) {
		statement.tag = 'g'
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

var gAlterationProcessors = [gBend, gBevel, gExpand, gFillet, gMirror, gOutset, gSplit, gTaper, gWedge]
var gAlterMeshMap = new Map()
var gGetPointsMap = new Map()
