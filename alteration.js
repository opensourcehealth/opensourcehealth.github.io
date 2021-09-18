//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addToAlterMesh(processors) {
	for (var processor of processors) {
		if (processor.optionMap != null) {
			if (processor.optionMap.has('alterMesh')) {
				gAlterMeshMap.set(processor.name, processor)
			}
		}
	}
}

function alterMeshExcept(exception, mesh, registry, statement) {
	var attributeMap = statement.attributeMap
	if (attributeMap.has('alterations')) {
		var alterations = attributeMap.get('alterations').split(',').filter(lengthCheck)
		for (var alteration of alterations) {
			if (alteration != exception) {
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

var gExpand = {
	alterMesh: function(mesh, registry, statement) {
		var transformed3DMatrix = getTransformed3DMatrix(null, statement)
		var expansionXY = getFloatsByDefault([1.0], 'expansionXY', registry, statement, this.name)
		var expansionZ = getFloatByDefault(0.0, 'expansionZ', registry, statement, this.name)
		var topPortion = getFloatByDefault(1.0, 'topPortion', registry, statement, this.name)
		expandMesh(expansionXY, expansionZ, transformed3DMatrix, topPortion, mesh)
	},
	name: 'expand',
	optionMap: new Map([['alterMesh', null]]),
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var workMesh = getWorkMesh(attributeMap, registry)
		if (workMesh == null) {
			return
		}
		this.alterMesh(workMesh, registry, statement)
		alterMeshExcept('expand', workMesh, registry, statement)
		analyzeOutputMesh(attributeMap, new Mesh(getMeshCopy(workMesh)), registry, statement)
	}
}

var gInset = {
	getPoints: function(points, registry, statement) {
		return getInsetPolygon(getInsets(statement), points)
	},
	name: 'inset',
	optionMap: null,
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		statement.tag = 'polygon'
		var points = getPolygonPoints(statement)
		if (points == null) {
			return
		}
		points = this.getPoints(points, registry, statement)
		attributeMap.set('points', points.join(' '))
	}
}

var gTaper = {
	alterMesh: function(mesh, registry, statement) {
		var transformed3DMatrix = getTransformed3DMatrix(null, statement)
		var overhangAngle = getFloatByDefault(40.0, 'overhangAngle', registry, statement, this.name)
		var sagAngle = getFloatByDefault(15.0, 'sagAngle', registry, statement, this.name)
		var maximumSpan = getFloatByDefault(1.0, 'maximumSpan', registry, statement, this.name)
		taperMesh(transformed3DMatrix, maximumSpan, mesh, overhangAngle, sagAngle)
	},
	name: 'taper',
	optionMap: new Map([['alterMesh', null]]),
	processStatement:function(registry, statement) {
		var attributeMap = statement.attributeMap
		var workMesh = getWorkMesh(attributeMap, registry)
		if (workMesh == null) {
			return
		}
		this.alterMesh(workMesh, registry, statement)
		analyzeOutputMesh(attributeMap, new Mesh(getMeshCopy(workMesh)), registry, statement)
	}
}

var gAlterationProcessors = [gExpand, gInset, gTaper]
var gAlterMeshMap = new Map()

addToAlterMesh(gAlterationProcessors)
