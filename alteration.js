//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addFillet(filletCenter, filletRotation, filletStart, numberOfFilletSides, points) {
	points.push(getXYAddition(filletCenter, filletStart))
	for (var filletIndex = 1; filletIndex < numberOfFilletSides; filletIndex++) {
		filletStart = getXYRotation(filletStart, filletRotation)
		points.push(getXYAddition(filletCenter, filletStart))
	}
}

function addRotationToCenterDirection(centerDirection) {
	var reverseRotation = [centerDirection.direction[0], -centerDirection.direction[1]]
	var lineRotatedY = centerDirection.center[0] * reverseRotation[1] + centerDirection.center[1] * reverseRotation[0]
	centerDirection.reverseRotation = reverseRotation
	centerDirection.mirrorFromY = lineRotatedY + lineRotatedY
}

function alterMeshExcept(mesh, registry, statement, tag) {
	if (statement.attributeMap.has('alterations')) {
		var alterations = statement.attributeMap.get('alterations').split(',').filter(lengthCheck)
		for (var alteration of alterations) {
			if (alteration != tag) {
				if (gAlterMeshMap.has(alteration)) {
					gAlterMeshMap.get(alteration).alterMesh(mesh, registry, statement)
				}
			}
		}
	}
}

function expandMesh(expansionXY, expansionZ, matrix, topPortion, workMesh) {
	if (workMesh == null) {
		return
	}
	if (expansionXY.length == 1) {
		expansionXY = [expansionXY[0], expansionXY[0]]
	}
	var points = getXYZsBy3DMatrix(get3DInverseRotation(matrix), workMesh.points)
	var explandedPoints = new Array(points.length)
	var integerPreviousArrowsMap = getIntegerPreviousArrowsMap(workMesh.facets)
	var minimumZ = Number.MAX_VALUE
	var maximumZ = -Number.MAX_VALUE
	for (var key of integerPreviousArrowsMap.keys()) {
		var centerPoint = points[key]
		var unitVectors = []
		for (var pointIndexes of integerPreviousArrowsMap.get(key)) {
			var unitVector = getXYZSubtraction(points[pointIndexes[0]], centerPoint)
			var unitVectorLength = getXYZLength(unitVector)
			if (unitVectorLength != 0.0) {
				divideXYZByScalar(unitVector, unitVectorLength)
				unitVector.push(points[pointIndexes[1]][2])
				unitVectors.push(unitVector)
			}
		}
		unitVectors.sort(compareAbsoluteElementTwoAscending)
		unitVectors.length = 2
		if (unitVectors[0][3] > unitVectors[1][3]) {
			unitVectors.reverse()
		}
		explandedPoints[key] = getInsetPoint(unitVectors[0], centerPoint, unitVectors[1], expansionXY)
		minimumZ = Math.min(minimumZ, centerPoint[2])
		maximumZ = Math.max(maximumZ, centerPoint[2])
	}
	var deltaZ = maximumZ - minimumZ
	var expandOverDeltaZ = expansionZ / deltaZ
	var expansionCenterZ = maximumZ - topPortion * deltaZ
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		var z = explandedPoints[pointIndex][2]
		explandedPoints[pointIndex][2] += (z - expansionCenterZ) * expandOverDeltaZ
	}
	workMesh.points = getXYZsBy3DMatrix(matrix, explandedPoints)
}

function getBoundedPoints2D(equations, points, polygons, registry, statement) {
	var pointIndexSet = new Set()
	if (equations != null) {
		var variableMap = statement.parent.variableMap
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
			var rectangle = getBoundingRectangle(polygon)
			var minimum = rectangle[0]
			var maximum = rectangle[1]
			for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
				var point = points[pointIndex]
				if (point[0] >= minimum[0] && point[0] <= maximum[0] && point[1] >= minimum[1] && point[1] <= maximum[1]) {
					if (getIsPointInsidePolygon(point, polygon)) {
						pointIndexSet.add(pointIndex)
					}
				}
			}
		}
	}
	return getBoundedPointsBySet(pointIndexSet, points)
}

function getBoundedPoints3D(equations, pointIndexSet, points, polygons, registry, statement, stratas) {
	if (equations != null) {
		var variableMap = statement.parent.variableMap
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
		return getBoundedPointsBySet(pointIndexSet, points)
	}
	for (var polygon of polygons) {
		var rectangle = getBoundingRectangle(polygon)
		var minimum = rectangle[0]
		var maximum = rectangle[1]
		for (var strata of stratas) {
			for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
				var point = points[pointIndex]
				if (getIsInStrata(strata, point[2])) {
					if (point[0] >= minimum[0] && point[0] <= maximum[0] && point[1] >= minimum[1] && point[1] <= maximum[1]) {
						if (getIsPointInsidePolygon(point, polygon)) {
							pointIndexSet.add(pointIndex)
						}
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
			var filletCenter = getXYAddition(centerPoint, getXYMultiplicationByScalar(centerVector, distanceToFilletCenter))
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

function getFilletedPolygons(numberOfSides, polygons, radius) {
	var filletedPolygons = new Array(polygons.length)
	for (var polygonsIndex = 0; polygonsIndex < polygons.length; polygonsIndex++) {
		filletedPolygons[polygonsIndex] = getFilletedPolygon(numberOfSides, polygons[polygonsIndex], radius)
	}
	return filletedPolygons
}
/*
function getIntegerArrowsMap(facets) {
	var integerArrowsMap = new Map()
	for (var facet of facets) {
		for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var beginIndex = facet[vertexIndex]
			var endIndex = facet[(vertexIndex + 1) % facet.length]
			addArrayElementToMap(endIndex, beginIndex, integerArrowsMap)
		}
	}
	return integerArrowsMap
}
*/
function getIntegerPreviousArrowsMap(facets) {
	var integerPreviousArrowsMap = new Map()
	for (var facet of facets) {
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var beginIndex = facet[(vertexIndex - 1 + facet.length) % facet.length]
			var centerIndex = facet[vertexIndex]
			var endIndex = facet[(vertexIndex + 1) % facet.length]
			addArrayElementToMap([endIndex, beginIndex], centerIndex, integerPreviousArrowsMap)
		}
	}
	return integerPreviousArrowsMap
}

function getInterpolatedIndexAlong(x, values) {
	if (values.length == 1) {
		return [0, null]
	}
	if (x <= values[0][0]) {
		return [0, null]
	}
	if (x >= values[values.length - 1][0]) {
		return [values.length - 1, null]
	}
	var lowerIndex = 0
	var upperIndex = values.length - 1
	for (var whileTestIndex = 0; whileTestIndex < gLengthLimit; whileTestIndex++) {
		var difference = upperIndex - lowerIndex
		if (difference < 2) {
			return [lowerIndex, (x - values[lowerIndex][0]) / (values[upperIndex][0] - values[lowerIndex][0])]
		}
		var middleIndex = lowerIndex + Math.round(difference / 2)
		if (x < values[middleIndex][0]) {
			upperIndex = middleIndex
		}
		else {
			lowerIndex = middleIndex
		}
	}
	return [0, null]
}

function getPointByCenterDirectionRotation(centerDirection, point) {
	var pointRotated = getXYRotation(point, centerDirection.reverseRotation)
	pointRotated[1] = centerDirection.mirrorFromY - pointRotated[1]
	return getXYRotation(pointRotated, centerDirection.direction)
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

function setPointsExcept(points, registry, statement, tag) {
	var points = getPointsExcept(points, registry, statement, tag)
	statement.attributeMap.set('points', points.join(' '))
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
	var inset = Math.max(maximumInset / approachRunOverRise, maximumInset - 0.5 * maximumSpan)
	var insetPolygon = getInsetPolygon([[inset]], highestPolygon)
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
			var variableMap = statement.parent.variableMap
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
		var indexAlong = getInterpolatedIndexAlong(vectorProjection, amplitudes)
		var lowerAmplitude = amplitudes[indexAlong[0]]
		var along = indexAlong[1]
		var minimumAmplitudeLength = lowerAmplitude.length
		if (along == null) {
			for (var dimensionIndex = 1; dimensionIndex < minimumAmplitudeLength; dimensionIndex++) {
				var interpolation = lowerAmplitude[dimensionIndex]
				addXY(point, getXYMultiplicationByScalar(basis2Ds[dimensionIndex % 2], interpolation))
			}
		}
		else {
			var upperAmplitude = amplitudes[indexAlong[0] + 1]
			minimumAmplitudeLength = Math.min(minimumAmplitudeLength, upperAmplitude.length)
			var oneMinusAlong = 1.0 - along
			for (var dimensionIndex = 1; dimensionIndex < minimumAmplitudeLength; dimensionIndex++) {
				var interpolation = oneMinusAlong * lowerAmplitude[dimensionIndex] + along * upperAmplitude[dimensionIndex]
				addXY(point, getXYMultiplicationByScalar(basis2Ds[dimensionIndex % 2], interpolation))
			}
		}
	}
}

function transformPoints3DByEquation(amplitudes, basis3Ds, center, points, registry, statement, translationEquations) {
	if (!getIsEmpty(translationEquations)) {
		for (var translationEquation of translationEquations) {
			var variableMap = statement.parent.variableMap
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
		var indexAlong = getInterpolatedIndexAlong(vectorProjection, amplitudes)
		var lowerAmplitude = amplitudes[indexAlong[0]]
		var along = indexAlong[1]
		var minimumAmplitudeLength = lowerAmplitude.length
		if (along == null) {
			for (var dimensionIndex = 1; dimensionIndex < minimumAmplitudeLength; dimensionIndex++) {
				var interpolation = lowerAmplitude[dimensionIndex]
				addXYZ(point, getXYZMultiplicationByScalar(basis3Ds[dimensionIndex % 3], interpolation))
			}
		}
		else {
			var upperAmplitude = amplitudes[indexAlong[0] + 1]
			minimumAmplitudeLength = Math.min(minimumAmplitudeLength, upperAmplitude.length)
			var oneMinusAlong = 1.0 - along
			for (var dimensionIndex = 1; dimensionIndex < minimumAmplitudeLength; dimensionIndex++) {
				var interpolation = oneMinusAlong * lowerAmplitude[dimensionIndex] + along * upperAmplitude[dimensionIndex]
				addXYZ(point, getXYZMultiplicationByScalar(basis3Ds[dimensionIndex % 3], interpolation))
			}
		}
	}
}

var gBend = {
	alterMesh: function(mesh, registry, statement) {
		var points = mesh.points
		var boundaryEquations = getStringsByMap('boundaryEquations', statement.attributeMap)
		var boundaryPolygons = getPolygonsRecursively(registry, statement)
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
		var stratas = getStratas(registry, statement)
		var boundedPoints = getBoundedPoints3D(boundaryEquations, pointIndexSet, points, boundaryPolygons, registry, statement, stratas)
		if (getIsEmpty(boundedPoints)) {
			return
		}
		var amplitudes = getPointsByKey('amplitudes', registry, statement)
		var basis3Ds = getFloatListsByStatement('basis3Ds', registry, statement)
		var center = getFloatsByStatement('center', registry, statement)
		var translationEquations = getStringsByMap('translationEquations', statement.attributeMap)
		transformPoints3DByEquation(amplitudes, basis3Ds, center, boundedPoints, registry, statement, translationEquations)
	},
	getPoints: function(points, registry, statement) {
		var boundaryEquations = getStringsByMap('boundaryEquations', statement.attributeMap)
		var boundaryPolygons = getPolygonsRecursively(registry, statement)
		var boundedPoints = getBoundedPoints2D(boundaryEquations, points, boundaryPolygons, registry, statement)
		if (getIsEmpty(boundedPoints)) {
			return points
		}
		var amplitudes = getPointsByKey('amplitudes', registry, statement)
		var basis2D = getFloatsByStatement('basis2D', registry, statement)
		var center = getFloatsByStatement('center', registry, statement)
		var translationEquations = getStringsByMap('translationEquations', statement.attributeMap)
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
			var workPoints = getPointsByKey('points', registry, workStatement)
			if (workPoints != null) {
				workStatement.attributeMap.set('points', this.getPoints(workPoints, registry, statement).join(' '))
			}
		}
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			this.alterMesh(workMesh, registry, statement)
			analyzeOutputMesh(new Mesh(getMeshCopy(workMesh)), registry, statement)
		}
		var points = getPointsByKey('points', registry, statement)
		if (points == null) {
			return
		}
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gExpand = {
	alterMesh: function(mesh, registry, statement) {
		var transformed3DMatrix = getTransformed3DMatrix(null, registry, statement)
		var expansionXY = getFloatsByDefault([1.0], 'expansionXY', registry, statement, this.name)
		var expansionZ = getFloatByDefault(0.0, 'expansionZ', registry, statement, this.name)
		var topPortion = getFloatByDefault(1.0, 'topPortion', registry, statement, this.name)
		expandMesh(expansionXY, expansionZ, transformed3DMatrix, topPortion, mesh)
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
			var workPoints = getPointsByKey('points', registry, workStatement)
			if (workPoints != null) {
				workPoints = this.getPoints(workPoints, registry, statement)
				setPointsExcept(workPoints, registry, workStatement, this.name)
			}
		}
		var points = getPointsByKey('points', registry, statement)
		if (points == null) {
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
		for (var point of mesh.points) {
			var mirrorPoint = getPointByCenterDirectionRotation(centerDirection, point)
			mirrorPoint.push(point[2])
			overwriteArray(point, mirrorPoint)
		}
		for (var facet of mesh.facets) {
			facet.reverse()
		}
	},
	getPoints: function(points, registry, statement) {
		var centerDirection = getCenterDirection(registry, statement)
		if (centerDirection != null) {
			addRotationToCenterDirection(centerDirection)
			for (var point of points) {
				overwriteArray(point, getPointByCenterDirectionRotation(centerDirection, point))
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
		var points = getPointsIncludingWork(registry, statement)
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
		for (var pointIndex = mirrorStart; pointIndex > -1; pointIndex--) {
			points.push(getPointByCenterDirectionRotation(centerDirection, points[pointIndex]))
		}
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gInset = {
	getPoints: function(points, registry, statement) {
		return getInsetPolygon(getInsets(statement), points)
	},
	initialize: function() {
		gGetPointsMap.set(this.name, this)
		gTagCenterMap.set(this.name, this)
	},
	name: 'inset',
	processStatement:function(registry, statement) {
		statement.tag = 'polygon'
		var points = getPointsIncludingWork(registry, statement)
		if (points == null) {
			return
		}
		points = this.getPoints(points, registry, statement)
		setPointsExcept(points, registry, statement, this.name)
	}
}

var gTaper = {
	alterMesh: function(mesh, registry, statement) {
		var transformed3DMatrix = getTransformed3DMatrix(null, registry, statement)
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

var gAlterationProcessors = [gBend, gExpand, gFillet, gInset, gMirror, gTaper]
var gAlterMeshMap = new Map()
var gGetPointsMap = new Map()
