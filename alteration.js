//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addFillet(filletCenter, filletRotation, filletStart, numberOfFilletSides, points) {
	points.push(addXY(filletCenter.slice(0), filletStart))
	for (var filletIndex = 1; filletIndex < numberOfFilletSides; filletIndex++) {
		filletStart = getXYRotation(filletStart, filletRotation)
		points.push(addXY(filletCenter.slice(0), filletStart))
	}
}

function addRotationToCenterDirection(centerDirection) {
	var reverseRotation = [centerDirection.direction[0], -centerDirection.direction[1]]
	var lineRotatedY = centerDirection.center[0] * reverseRotation[1] + centerDirection.center[1] * reverseRotation[0]
	centerDirection.reverseRotation = reverseRotation
	centerDirection.mirrorFromY = lineRotatedY + lineRotatedY
}

function addTo3DPointIndexSet(equations, pointIndexSet, points, polygons, registry, statement, stratas) {
	if (getIsEmpty(equations) && pointIndexSet.size == 0 && getIsEmpty(polygons)) {
		addElementsToSet(points, pointIndexSet)
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
	if (getIsEmpty(polygons)) {
		return getBoundedPointsBySet(pointIndexSet, points)
	}
	for (var polygon of polygons) {
		var boundingBox = getBoundingBox(polygon)
		for (var strata of stratas) {
			for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
				var point = points[pointIndex]
				if (getIsInStrata(strata, point[2])) {
					if (isPointInsideBoundingBox(boundingBox, point)) {
						if (getIsPointInsidePolygon(point, polygon)) {
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

function expandMesh(expansionBottom, expansionXY, expansionTop, matrix, mesh) {
	if (mesh == null) {
		return
	}
	if (expansionXY.length == 1) {
		expansionXY.push(expansionXY[0])
	}
	var facets = mesh.facets
	mesh.points = getXYZsBy3DMatrix(get3DInverseRotation(matrix), mesh.points)
	var directionMapZ = getDirectionMapZ(facets, mesh.points)
	var horizontalDirectionMap = directionMapZ.horizontalDirectionMap
	for (var key of horizontalDirectionMap.keys()) {
		addXY(mesh.points[key], getXYMultiplication(horizontalDirectionMap.get(key), expansionXY))
	}
	var bottomOverDeltaZ = expansionBottom / directionMapZ.deltaZ
	var topOverDeltaZ = expansionTop / directionMapZ.deltaZ
	var zAddition = - directionMapZ.minimumZ * topOverDeltaZ - directionMapZ.maximumZ * bottomOverDeltaZ
	var zMultiplier = topOverDeltaZ + bottomOverDeltaZ
	for (var point of mesh.points) {
		point[2] += point[2] * zMultiplier + zAddition
	}
	mesh.points = getXYZsBy3DMatrix(matrix, mesh.points)
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
				if (isPointInsideBoundingBox(boundingBox, point)) {
					if (getIsPointInsidePolygon(point, polygon)) {
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
		return {center:center, direction:normalizeXY([-center[1], center[0]])}
	}
	direction[0] = getValueByDefault(0.0, direction[0])
	if (direction.length == 1) {
		var angle = direction[0] * gRadiansPerDegree
		return {center:center, direction:[Math.cos(angle), -Math.sin(angle)]}
	}
	direction[1] = getValueByDefault(0.0, direction[1])
	var directionLength = getXYLength(direction)
	if (directionLength == 0.0) {
		return {center:center, direction:[1.0, 0.0]}
	}
	return {center:center, direction:divideXYByScalar(direction, directionLength)}
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
		var addition = getXYAddition(normalizeXY(unitVectors[0]), normalizeXY(unitVectors[1]))
		horizontalDirectionMap.set(key, multiplyXYByScalar(addition, 2.0 / getXYLengthSquared(addition)))
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
		var centerBegin = getXYSubtraction(beginPoint, centerPoint)
		var centerBeginLength = getXYLength(centerBegin)
		var centerEnd = getXYSubtraction(endPoint, centerPoint)
		var centerEndLength = getXYLength(centerEnd)
		var minimumLength = 0.5 * Math.min(centerBeginLength, centerEndLength)
		divideXYByScalar(centerBegin, centerBeginLength)
		divideXYByScalar(centerEnd, centerEndLength)
		var rotatedEnd = getXYRotation(centerEnd, [-centerBegin[0], centerBegin[1]])
		var cornerAngle = Math.atan2(rotatedEnd[1], rotatedEnd[0])
		var numberOfFilletSides = Math.ceil(Math.abs(cornerAngle) / maximumAngle - gClose)
		if (numberOfFilletSides < 2) {
			filletedPolygon.push(centerPoint)
		}
		else {
			var centerVector = normalizeXY(getXYAddition(centerBegin, centerEnd))
			var dotProduct = getXYDotProduct(centerVector, centerBegin)
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
			var beginTangent = getXYAddition(centerPoint, getXYMultiplicationByScalar(centerBegin, distanceToTangent))
			var endTangent = getXYAddition(centerPoint, getXYMultiplicationByScalar(centerEnd, distanceToTangent))
			var distanceToFilletCenter = filletRadius / perpendicular
			var filletCenter = addXY(centerPoint.slice(0), getXYMultiplicationByScalar(centerVector, distanceToFilletCenter))
			var filletAngle = -cornerAngle / numberOfFilletSides
			var filletRotation = getXYPolar(filletAngle)
			var halfAngleRotation = getXYPolar(0.5 * filletAngle)
			var beginTangentFilletCenter = getXYRotation(getXYSubtraction(beginTangent, filletCenter), halfAngleRotation)
			var filletStart = divideXYByScalar(beginTangentFilletCenter, halfAngleRotation[0])
			addFillet(filletCenter, filletRotation, filletStart, numberOfFilletSides, filletedPolygon)
		}
	}
	return filletedPolygon
}

//deprecated
/*
function getInterpolatedIndexAlong(x, points) {
	if (points.length == 1) {
		return [0, 0.0]
	}
	var beginPoint = points[0]
	var beginPointX = beginPoint[0]
	if (x <= beginPointX) {
		var run = points[1][0] - beginPointX
		if (run == 0.0) {
			return [0, 0.0]
		}
		return [0, null]
	}
	if (x <= points[0][0]) {
		return [0, null]
	}
	var upperIndex = points.length - 1
	if (x >= points[upperIndex][0]) {
		return [upperIndex, null]
	}
	var lowerIndex = 0
	for (var whileTestIndex = 0; whileTestIndex < gLengthLimit; whileTestIndex++) {
		var difference = upperIndex - lowerIndex
		if (difference < 2) {
			return [lowerIndex, (x - points[lowerIndex][0]) / (points[upperIndex][0] - points[lowerIndex][0])]
		}
		var middleIndex = lowerIndex + Math.round(difference / 2)
		if (x < points[middleIndex][0]) {
			upperIndex = middleIndex
		}
		else {
			lowerIndex = middleIndex
		}
	}
	return [0, null]
}
*/
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
	var lowerIndex = 0
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

function splitMesh(equations, matrix, mesh, polygons, registry, splitHeights, statement) {
	if (mesh == null || getIsEmpty(splitHeights)) {
		return
	}
	mesh.points = getXYZsBy3DMatrix(get3DInverseRotation(matrix), mesh.points)
	var points = mesh.points
	if (getIsEmpty(equations) && getIsEmpty(polygons)) {
		addSplitIndexesByHeightsOnly(splitHeights, mesh)
	}
	else {
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
					if (getIsPolygonIntersectingOrClose(polygon, getPolygonByFacet(mesh.facets[facetIndex], points))) {
						facetIndexSet.add(facetIndex)
						break
					}
				}
			}
		}
		for (var splitHeight of splitHeights) {
			addSplitIndexesByFacetSet(facetIndexSet, splitHeight, mesh)
		}
	}
	mesh.points = getXYZsBy3DMatrix(matrix, mesh.points)
}

function taperMesh(matrix, maximumSpan, mesh, overhangAngle, sagAngle) {
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
	var inversePoints = getXYZsBy3DMatrix(get3DInverseRotation(matrix), originalPoints)
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
	var inset = -Math.max(maximumInset / approachRunOverRise, maximumInset - 0.5 * maximumSpan)
	var insetPolygon = getOutsetPolygon([inset, inset], highestPolygon)
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
	pushArray(originalPoints, getXYZsBy3DMatrix(matrix, inversePoints.slice(originalPoints.length, inversePoints.length)))
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
					addXY(point, value)
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
	var basis2DLength = getXYLength(basis2D)
	if (basis2DLength == 0.0) {
		return
	}
	divideXYByScalar(basis2D, basis2DLength)
	var basis2Ds = [basis2D, [-basis2D[1], basis2D[0]]]
	if (getIsEmpty(center)) {
		center = [0.0, 0.0]
	}
	if (center.length == 1) {
		center.push(0.0)
	}
	for (var point of points) {
		var centerPoint = getXYSubtraction(point, center)
		var vectorProjection = getXYDotProduct(basis2D, centerPoint)
		var interpolationAlong = getInterpolationAlongBeginEnd(vectorProjection, amplitudes)
		var along = interpolationAlong[0]
		var oneMinus = 1.0 - along
		var lowerAmplitude = amplitudes[interpolationAlong[1]]
		var upperAmplitude = amplitudes[interpolationAlong[2]]
		var minimumAmplitudeLength = Math.min(lowerAmplitude.length, upperAmplitude.length)
		for (var dimensionIndex = 1; dimensionIndex < minimumAmplitudeLength; dimensionIndex++) {
			var interpolation = oneMinus * lowerAmplitude[dimensionIndex] + along * upperAmplitude[dimensionIndex]
			addXY(point, getXYMultiplicationByScalar(basis2Ds[dimensionIndex % 2], interpolation))
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
					addXYZ(point, value)
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
	var basis3DXLength = getXYZLength(basis3Ds[0])
	if (basis3DXLength == 0.0) {
		return
	}
	divideXYByScalar(basis3Ds[0], basis3DXLength)
	if (basis3Ds.length == 1) {
		var basis3DY = [-basis3Ds[0][1], basis3Ds[0][0], 0.0]
		normalizeXY(basis3DY)
		basis3Ds.push(basis3DY)
	}
	
	if (basis3Ds.length == 2) {
		var basis3DZ = getCrossProduct(basis3Ds[0], basis3Ds[1])
		normalizeXYZ(basis3DZ)
		basis3Ds.push(basis3DZ)
	}
	if (getIsEmpty(center)) {
		center = [0.0, 0.0]
	}
	if (center.length == 1) {
		center.push(0.0)
	}
	for (var point of points) {
		var centerPoint = getXYSubtraction(point, center)
		var vectorProjection = getXYDotProduct(basis3Ds[0], centerPoint)
		var interpolationAlong = getInterpolationAlongBeginEnd(vectorProjection, amplitudes)
		var along = interpolationAlong[0]
		var oneMinus = 1.0 - along
		var lowerAmplitude = amplitudes[interpolationAlong[1]]
		var upperAmplitude = amplitudes[interpolationAlong[2]]
		var minimumAmplitudeLength = Math.min(lowerAmplitude.length, upperAmplitude.length)
		for (var dimensionIndex = 1; dimensionIndex < minimumAmplitudeLength; dimensionIndex++) {
			var interpolation = oneMinus * lowerAmplitude[dimensionIndex] + along * upperAmplitude[dimensionIndex]
			addXYZ(point, getXYZMultiplicationByScalar(basis3Ds[dimensionIndex % 3], interpolation))
		}
	}
}

function wedgeMesh(inset, matrix, mesh) {
	if (mesh == null) {
		return
	}
	if (inset.length == 1) {
		inset = [inset[0], inset[0]]
	}
	var facets = mesh.facets
	mesh.points = getXYZsBy3DMatrix(get3DInverseRotation(matrix), mesh.points)
	var directionMapZ = getDirectionMapZ(facets, mesh.points)
	var horizontalDirectionMap = directionMapZ.horizontalDirectionMap
	var oneOverDeltaZ = 1.0 / directionMapZ.deltaZ
	for (var key of horizontalDirectionMap.keys()) {
		var centerPoint = mesh.points[key]
		var insetAtZ = getXYMultiplicationByScalar(inset, (directionMapZ.minimumZ - centerPoint[2]) * oneOverDeltaZ)
		mesh.points[key] = addXY(centerPoint.slice(0), getXYMultiplication(horizontalDirectionMap.get(key), insetAtZ))
	}
	mesh.points = getXYZsBy3DMatrix(matrix, mesh.points)
}

var gBend = {
	alterMesh: function(mesh, registry, statement) {
		var boundaryEquations = getEquations('boundary', statement)
		var boundaryPolygons = getPolygonsHDRecursively(registry, statement)
		var pointIndexSet = new Set()
		if (statement.attributeMap.has('pointIndexes')) {
			var pointIndexesString = statement.attributeMap.get('pointIndexes')
			if (pointIndexesString.length == 0) {
				if (mesh.splits != undefined) {
					addElementsToSet(mesh.splits, pointIndexSet)
					statement.attributeMap.set('pointIndexes', mesh.splits.toString())
				}
			}
			else {
				var intsUpdate = getIntsUpdateByStatementValue(registry, statement, pointIndexesString)
				addElementsToSet(intsUpdate[0], pointIndexSet)
				if (intsUpdate[1]) {
					statement.attributeMap.set('pointIndexes', intsUpdate[0].toString())
				}
			}
		}
		var matrix = getChainMatrix3D(registry, statement)
		var stratas = getStratas(registry, statement)
		var points = getXYZsBy3DMatrix(get3DInverseRotation(matrix), mesh.points)
		addTo3DPointIndexSet(boundaryEquations, pointIndexSet, points, boundaryPolygons, registry, statement, stratas)
		if (pointIndexSet.size == 0) {
			return
		}
		var boundedPoints = getBoundedPointsBySet(pointIndexSet, points)
		var amplitudes = getPointsByKey('amplitudes', registry, statement)
		var basis3Ds = getFloatListsByStatement('basis3Ds', registry, statement)
		var center = getFloatsByStatement('center', registry, statement)
		var translationEquations = getEquations('translation', statement)
		transformPoints3DByEquation(amplitudes, basis3Ds, center, boundedPoints, registry, statement, translationEquations)
		mesh.points = getXYZsBy3DMatrix(matrix, points)
	},
	getPoints: function(points, registry, statement) {
		var boundaryEquations = getEquations('boundary', statement)
		var boundaryPolygons = getPolygonsHDRecursively(registry, statement)
		var boundedPoints = getBoundedPoints2D(boundaryEquations, points, boundaryPolygons, registry, statement)
		if (getIsEmpty(boundedPoints)) {
			return points
		}
		var amplitudes = getPointsByKey('amplitudes', registry, statement)
		var basis2D = getFloatsByStatement('basis2D', registry, statement)
		var center = getFloatsByStatement('center', registry, statement)
		var translationEquations = getEquations('translation', statement)
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
		var workStatement = getWorkStatement(registry, statement)
		if (workStatement != null) {
			var workPoints = getPointsHD(registry, workStatement)
			if (workPoints != null) {
				setPointsHD(this.getPoints(workPoints, registry, statement), workStatement)
			}
		}
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			this.alterMesh(workMesh, registry, statement)
			analyzeOutputMesh(new Mesh(getMeshCopy(workMesh)), registry, statement)
		}
		var points = getPointsHD(registry, statement)
		if (points == null) {
			return
		}
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gExpand = {
	alterMesh: function(mesh, registry, statement) {
		var matrix = getChainMatrix3D(registry, statement)
		var expansionXY = getFloatsByDefault([1.0], 'expansionXY', registry, statement, this.name)

//deprecated
		var expansionZ = getFloatByDefault(0.0, 'expansionZ', registry, statement, this.name)

		var expansionBottom = getFloatByDefault(0.0, 'expansionBottom', registry, statement, this.name)
		var expansionTop = getFloatByDefault(expansionZ, 'expansionTop', registry, statement, this.name)
		expandMesh(expansionBottom, expansionXY, expansionTop, matrix, mesh)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'expand',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			return
		}
		this.alterMesh(workMesh, registry, statement)
		analyzeOutputMesh(new Mesh(getMeshCopy(workMesh)), registry, statement)
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
		var workStatement = getWorkStatement(registry, statement)
		if (workStatement != null) {
			var workPoints = getPointsHD(registry, workStatement)
			if (workPoints != null) {
				workPoints = this.getPoints(workPoints, registry, statement)
				setPointsExcept(workPoints, registry, workStatement, this.name)
			}
		}
		var points = getPointsHD(registry, statement)
		if (points == null) {
			return
		}
		statement.tag = 'polygon'
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gOutset = {
	getPoints: function(points, registry, statement) {
		var markerAbsolute = getBooleanByDefault(true, 'markerAbsolute', registry, statement, this.name)
		var marker = getPointsByKey('marker', registry, statement)
		var radius = getPointByDefault([1.0, 1.0], 'radius', registry, statement, this.name)
		return getOutsetPolygonByMarker(marker, markerAbsolute, radius, points)
	},
	initialize: function() {
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'outset',
	processStatement:function(registry, statement) {
		statement.tag = 'polygon'
		var points = getPointsHD(registry, statement)
		if (points == null) {
			return
		}
		var checkIntersection = getBooleanByDefault(false, 'checkIntersection', registry, statement, this.name)
		var clockwise = getBooleanByDefault(getIsClockwise(points), 'clockwise', registry, statement, this.name)
		var markerAbsolute = getBooleanByDefault(false, 'markerAbsolute', registry, statement, this.name)
		var marker = getPointsByKey('marker', registry, statement)
		var radius = getPointByDefault([1.0, 1.0], 'radius', registry, statement, this.name)
		var outsetPolygons = getOutsetPolygonsByDirection(checkIntersection, clockwise, marker, markerAbsolute, radius, points)
		if (getIsEmpty(outsetPolygons)) {
			setPointsExcept([], registry, statement, this.name)
			return
		}
		if (outsetPolygons.length == 1) {
			setPointsExcept(outsetPolygons[0], registry, statement, this.name)
		}
		addClosingStatementConvertToGroup(statement)
		addPolygonsToGroup(outsetPolygons, registry, statement)
	}
}

var gMirror = {
	alterMesh: function(mesh, registry, statement) {
		var centerDirection = getCenterDirection(registry, statement)
		if (centerDirection == null) {
			return
		}
		addRotationToCenterDirection(centerDirection)
		var matrix = getChainMatrix3D(registry, statement)
		mesh.points = getXYZsBy3DMatrix(get3DInverseRotation(matrix), mesh.points)
		for (var point of mesh.points) {
			mirrorByCenterDirectionRotation(centerDirection, point)
		}
		mesh.points = getXYZsBy3DMatrix(matrix, mesh.points)
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
		statement.tag = getValueByKeyDefault('polygon', 'tag', registry, statement, this.name)
		var points = getPointsHD(registry, statement)
		if (points == null) {
			return
		}
		var centerDirection = getCenterDirection(registry, statement)
		var mirrorStart = points.length - 1
		if (centerDirection == null) {
			if (points.length < 2) {
				centerDirection = {center:center, direction:[1.0, 0.0]}
			}
			else {
				var penultimatePoint = points[points.length - 2]
				var ultimatePoint = points[points.length - 1]
				direction = getXYSubtraction(ultimatePoint, penultimatePoint)
				direction = [direction[1], -direction[0]]
				perpendicular = multiplyXYByScalar(getXYAddition(penultimatePoint, ultimatePoint), 0.5)
				mirrorStart -= 2
				var directionLength = getXYLength(direction)
				if (directionLength == 0.0) {
					direction = [1.0, 0.0]
				}
				else {
					divideXYByScalar(direction, directionLength)
				}
				centerDirection = {center:perpendicular.slice(0), direction:direction.slice(0)}
			}
		}
		addRotationToCenterDirection(centerDirection)
		var pointZero = points[0]
		var pointStart = points[mirrorStart]
		if (getXYDistanceSquared(pointStart, mirrorByCenterDirectionRotation(centerDirection, pointStart.slice(0))) < gCloseSquared) {
			mirrorStart -= 1
		}
		for (var pointIndex = mirrorStart; pointIndex > -1; pointIndex--) {
			var mirrorPoint = mirrorByCenterDirectionRotation(centerDirection, points[pointIndex].slice(0))
			if (getXYDistanceSquared(pointZero, mirrorPoint) < gCloseSquared) {
				break
			}
			points.push(mirrorPoint)
		}
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gSplit = {
	alterMesh: function(mesh, registry, statement) {
		var equations = getEquations('boundary', statement)
		var polygons = getPolygonsHDRecursively(registry, statement)
		var splitHeights = getFloatsByStatement('splitHeights', registry, statement)
		var transformed3DMatrix = getChainMatrix3D(registry, statement)
		splitMesh(equations, transformed3DMatrix, mesh, polygons, registry, splitHeights, statement)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'split',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			return
		}
		this.alterMesh(workMesh, registry, statement)
		analyzeOutputMesh(new Mesh(getMeshCopy(workMesh)), registry, statement)
	}
}

var gTaper = {
	alterMesh: function(mesh, registry, statement) {
		var transformed3DMatrix = getChainMatrix3D(registry, statement)
		var overhangAngle = getFloatByDefault(40.0, 'overhangAngle', registry, statement, this.name)
		var sagAngle = getFloatByDefault(15.0, 'sagAngle', registry, statement, this.name)
		var maximumSpan = getFloatByDefault(1.0, 'maximumSpan', registry, statement, this.name)
		taperMesh(transformed3DMatrix, maximumSpan, mesh, overhangAngle, sagAngle)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'taper',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			return
		}
		this.alterMesh(workMesh, registry, statement)
		analyzeOutputMesh(new Mesh(getMeshCopy(workMesh)), registry, statement)
	}
}

var gWedge = {
	alterMesh: function(mesh, registry, statement) {
		var radius = getPointByDefault([1.0, 1.0], 'radius', registry, statement, this.name)
		var matrix = getChainMatrix3D(registry, statement)
		wedgeMesh(radius, matrix, mesh)
	},
	initialize: function() {
		gAlterMeshMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'wedge',
	processStatement:function(registry, statement) {
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			this.alterMesh(workMesh, registry, statement)
			analyzeOutputMesh(new Mesh(getMeshCopy(workMesh)), registry, statement)
		}
		var polygons = getPolygonsHDRecursively(registry, statement)
		if (getIsEmpty(polygons)) {
			return
		}
		var heights = getHeights(registry, statement, this.name)
		var matrix = getChainMatrix3D(registry, statement)
		var pillar = new Pillar(heights, matrix, polygons)
		this.alterMesh(pillar.getMesh(), registry, statement)
		analyzeOutputMesh(pillar, registry, statement)
	}
}

var gAlterationProcessors = [gBend, gExpand, gFillet, gMirror, gOutset, gSplit, gTaper, gWedge]
var gAlterMeshMap = new Map()
var gGetPointsMap = new Map()
