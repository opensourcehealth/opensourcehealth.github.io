//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addFacetsByBottomTopFacet(bottomFacet, facets, topFacet) {
	var skipSet = getSkipSet(bottomFacet)
	for (var vertexIndex = 0; vertexIndex < bottomFacet.length; vertexIndex++) {
		if (!skipSet.has(vertexIndex)) {
			var endIndex = (vertexIndex + 1) % bottomFacet.length
			facets.push([bottomFacet[vertexIndex], bottomFacet[endIndex], topFacet[endIndex], topFacet[vertexIndex]])
		}
	}
}

function addHolesToFacet(facetIndex, holePolygonLists, mesh) {
	var facet = mesh.facets[facetIndex]
	var points = mesh.points
	var polygon = getPolygonByFacet(facet, points)
	var isClockwise = getIsClockwise(polygon)
	var minimumX = polygon[0][0]
	var z = polygon[0][2]
	for (var polygonIndex = 1; polygonIndex < polygon.length; polygonIndex++) {
		minimumX = Math.min(minimumX, polygon[polygonIndex][0])
	}
	var pointIndex = points.length
	var holePolygons = holePolygonLists[Math.round(minimumX)]
	var holeFacets = new Array(holePolygons.length)
	for (var holeIndex = 0; holeIndex < holePolygons.length; holeIndex++) {
		var holePolygon = holePolygons[holeIndex]
		var holeFacet = new Array(holePolygon.length)
		points.length += holePolygon.length
		for (var vertexIndex = 0; vertexIndex < holePolygon.length; vertexIndex++) {
			holeFacet[vertexIndex] = pointIndex
			points[pointIndex] = [holePolygon[vertexIndex][0] + minimumX, holePolygon[vertexIndex][1], z]
			pointIndex += 1
		}
		if (isClockwise) {
			holeFacet.reverse()
		}
		holeFacets[holeIndex] = holeFacet
	}
	mesh.facets[facetIndex] = getConnectedFacet(arrayKit.pushArray([facet], holeFacets), points)
}

function addHolesToFence(bottoms, mesh, overhangAngle, thickness, tops, width) {
	var holePolygonLists = new Array(tops.length - 1)
	for (var topIndex = 0; topIndex < tops.length - 1; topIndex++) {
		var nextIndex = topIndex + 1
		var top = tops[topIndex]
		var nextTop = tops[nextIndex]
		var bottom = Math.max(bottoms[topIndex], bottoms[nextIndex])
		var outerTopRight = [Vector.distance2D(top, nextTop), Math.min(top[2], nextTop[2])]
		var innerLeft = thickness
		if (topIndex > 0) {
			innerLeft *= 0.5
		}
		var rightThickness = thickness
		if (topIndex < tops.length - 2) {
			rightThickness *= 0.5
		}
		var innerRight = outerTopRight[0] - rightThickness
		holePolygons = getHolePolygons(innerLeft, innerRight, bottom, outerTopRight, overhangAngle, thickness, width)
		var multiplier = [1.0 / outerTopRight[0], 1.0 / (outerTopRight[1] - bottom)]
		holePolygonLists[topIndex] = addArrayArraysByY(multiply2DArrays(holePolygons, multiplier), -bottom * multiplier[1])
	}
	var facetIndexes = getHorizontalFacetIndexes(mesh)
	for (var facetIndex of facetIndexes) {
		addHolesToFacet(facetIndex, holePolygonLists, mesh)
	}
}

function convertPlankToRoad(betweens, centers, curve, matrix3D, mesh, registry, statement) {
	var top = mesh.points[0][2]
	//y>z -z>y
	for (var point of mesh.points) {
		top = Math.max(top, point[2])
		var y = point[1]
		point[1] = -point[2]
		point[2] = y
	}
	addSplitIndexes(statement.attributeMap.get('id'), betweens, mesh)
	//z>y -y>z
	for (var point of mesh.points) {
		var z = point[2]
		point[2] = -point[1]
		point[1] = z
	}
	if (arrayKit.getIsEmpty(centers)) {
		return mesh
	}
	var oldWidth = 1.0
	var oldAngle = 0.0
	for (var center of centers) {
		if (center.length < 4) {
			center.length = 4
		}
		if (center[2] == undefined) {
			center[2] = oldWidth
		}
		oldWidth = center[2]
		if (center[3] == undefined) {
			center[3] = oldAngle
		}
		else {
			center[3] = -Math.tan(center[3] * gRadiansPerDegree)
		}
		oldAngle = center[3]
	}
	var firstWidth = centers[0][2]
	var lefts = new Array(centers.length)
	var rights = new Array(centers.length)
	var centersLengthMinus = centers.length - 1
	var insetDeltas = new Array(centers.length)
	for (var vertexIndex = 1; vertexIndex < centersLengthMinus; vertexIndex++) {
		var centerPoint = centers[vertexIndex]
		var centerBegin = normalize2D(Vector.getSubtraction2D(centers[(vertexIndex - 1 + centers.length) % centers.length], centerPoint))
		var centerEnd = normalize2D(Vector.getSubtraction2D(centers[(vertexIndex + 1) % centers.length], centerPoint))
		insetDeltas[vertexIndex] = getInsetDelta(centerBegin, centerEnd)
	}
	var centerEnd = normalize2D(Vector.getSubtraction2D(centers[1], centers[0]))
	insetDeltas[0] = [centerEnd[1], -centerEnd[0]]
	var centerBegin = normalize2D(Vector.getSubtraction2D(centers[centersLengthMinus], centers[centers.length - 2]))
	insetDeltas[centersLengthMinus] = [centerBegin[1], -centerBegin[0]]
	for (var centerIndex = 0; centerIndex < centers.length; centerIndex++) {
		var center = centers[centerIndex]
		var insetRight = Vector.getMultiplication2DScalar(insetDeltas[centerIndex], 0.5 * center[2])
		lefts[centerIndex] = [center[0] - insetRight[0], center[1] - insetRight[1]]
		rights[centerIndex] = [center[0] + insetRight[0], center[1] + insetRight[1]]
	}
	var variableMap = getVariableMapByStatement(statement)
	for (var point of mesh.points) {
		var x = point[0]
		var xIndex = Math.floor(x)
		var left = lefts[xIndex]
		var right = rights[xIndex]
		var y = point[1]
		var oneMinusY = 1.0 - y
		var width = centers[xIndex][2]
		var halfWidth = 0.5 * width
		var aboveCenter = y - 0.5
		var deltaZ = aboveCenter * halfWidth * centers[xIndex][3]
		if (curve != undefined) {
			variableMap.set('y', (aboveCenter * firstWidth).toString())
			deltaZ += getValueByEquation(registry, statement, curve) * width / firstWidth
		}
		point[0] = oneMinusY * right[0] + y * left[0]
		point[1] = oneMinusY * right[1] + y * left[1]
		point[2] *= 1.0 + (deltaZ / top)
	}
	return mesh
}

function convertPlankToFence(betweens, bottoms, curve, matrix3D, mesh, registry, statement, tops) {
	var deltaZs = new Array(tops.length)
	tops = getPolygon3D(tops, 1.0)
	for (var topIndex = 0; topIndex < tops.length; topIndex++) {
		deltaZs[topIndex] = tops[topIndex][2] - bottoms[topIndex]
	}
	var deltaZeroZ = deltaZs[0]
	var insetDeltas = new Array(tops.length)
	var topsLengthMinus = tops.length - 1
	for (var vertexIndex = 1; vertexIndex < topsLengthMinus; vertexIndex++) {
		var centerPoint = tops[vertexIndex]
		var centerBegin = normalize2D(Vector.getSubtraction2D(tops[(vertexIndex - 1 + tops.length) % tops.length], centerPoint))
		var centerEnd = normalize2D(Vector.getSubtraction2D(tops[(vertexIndex + 1) % tops.length], centerPoint))
		insetDeltas[vertexIndex] = getInsetDelta(centerBegin, centerEnd)
	}
	var centerEnd = normalize2D(Vector.getSubtraction2D(tops[1], tops[0]))
	insetDeltas[0] = [centerEnd[1], -centerEnd[0]]
	var centerBegin = normalize2D(Vector.getSubtraction2D(tops[topsLengthMinus], tops[tops.length - 2]))
	insetDeltas[topsLengthMinus] = [centerBegin[1], -centerBegin[0]]
	//y>z -z>y
	for (var point of mesh.points) {
		var y = point[1]
		point[1] = -point[2]
		point[2] = y
	}
	addSplitIndexes(statement.attributeMap.get('id'), betweens, mesh)
	var bottomZeroZ = bottoms[0]
	var variableMap = getVariableMapByStatement(statement)
	for (var point of mesh.points) {
		var x = point[0]
		var xIndex = Math.floor(x)
		var along = x - xIndex
		var oneMinusAlong = 1.0 - along
		var nextIndex = (xIndex + 1) % tops.length
		var value = 0.0
		if (curve != undefined) {
			variableMap.set('z', ((point[2] * deltaZeroZ) + bottomZeroZ).toString())
			value = getValueByEquation(registry, statement, curve) * (oneMinusAlong * deltaZs[xIndex] + along * deltaZs[nextIndex])
		}
		point[2] *= oneMinusAlong * tops[xIndex][2] + along * tops[nextIndex][2]
		point[2] += oneMinusAlong * bottoms[xIndex] + along * bottoms[nextIndex]
		var minusY = -point[1] - value
		var inset = Vector.getAddition2D(tops[xIndex], Vector.getMultiplication2DScalar(insetDeltas[xIndex], minusY))
		var nextInset = Vector.getAddition2D(tops[nextIndex], Vector.getMultiplication2DScalar(insetDeltas[nextIndex], minusY))
		point[0] = oneMinusAlong * inset[0] + along * nextInset[0]
		point[1] = oneMinusAlong * inset[1] + along * nextInset[1]
	}
	mesh.points = get3DsByMatrix3D(mesh.points, matrix3D)
}

var extrusion = {
	addToMesh: function(matrices, mesh, polygon3DGroup, isJoined) {
		var facets = mesh.facets
		var points = mesh.points
		var pointIndex = points.length
		var horizontalFacetsGroup = new Array(polygon3DGroup.length)
		for (var polygon3DIndex = 0; polygon3DIndex < polygon3DGroup.length; polygon3DIndex++) {
			var polygon3D = polygon3DGroup[polygon3DIndex]
			var horizontalFacets = new Array(matrices.length)
			var facetVertexIndexes = getFacetVertexIndexes(polygon3D)
			points.length += facetVertexIndexes.length * matrices.length
			for (var matrixIndex = 0; matrixIndex < matrices.length; matrixIndex++) {
				var horizontalFacet = addArrayScalar(facetVertexIndexes.facet.slice(0), pointIndex)
				var matrix3D = matrices[matrixIndex]
				var vertexIndexes = facetVertexIndexes.vertexIndexes
				for (var vertexIndex of vertexIndexes) {
					points[pointIndex++] = get3DByHeightMatrix3D(polygon3D[vertexIndex], matrix3D)
				}
				horizontalFacets[matrixIndex] = horizontalFacet
			}
			horizontalFacetsGroup[polygon3DIndex] = horizontalFacets
		}

		var horizontalFacetsZero = horizontalFacetsGroup[0]
		var bottomFacet = horizontalFacetsZero[0]
		var topFacet = horizontalFacetsZero[horizontalFacetsZero.length - 1]
		if (horizontalFacetsGroup.length > 1) {
			var pointMap = new Map()
			var bottomFacets = new Array(horizontalFacetsGroup.length)
			for (var horizontalIndex = 0; horizontalIndex < horizontalFacetsGroup.length; horizontalIndex++) {
				var horizontalFacets = horizontalFacetsGroup[horizontalIndex]
				var horizontalBottomFacet = horizontalFacets[0]
				bottomFacets[horizontalIndex] = horizontalBottomFacet
				for (var vertexIndex = 0; vertexIndex < horizontalBottomFacet.length; vertexIndex++) {
					pointMap.set(horizontalBottomFacet[vertexIndex], horizontalFacets[horizontalFacets.length - 1][vertexIndex])
				}
			}
			bottomFacet = getConnectedFacet(bottomFacets, points)
			topFacet = new Array(bottomFacet.length)
			var vertexIndex = 0
			for (var pointIndex of bottomFacet) {
				topFacet[vertexIndex] = pointMap.get(pointIndex)
				vertexIndex += 1
			}
		}

		if (isJoined != true) {
			facets.push(bottomFacet)
		}

		for (var horizontalFacets of horizontalFacetsGroup) {
			for (var horizontalFacetIndex = 0; horizontalFacetIndex < horizontalFacets.length - 1; horizontalFacetIndex++) {
				addFacetsByBottomTopFacet(horizontalFacets[horizontalFacetIndex], facets, horizontalFacets[horizontalFacetIndex + 1])
			}
			if (isJoined == true) {
				addFacetsByBottomTopFacet(horizontalFacets[horizontalFacets.length - 1], facets, horizontalFacets[0])
			}
		}

		if (isJoined != true) {
			bottomFacet.reverse()
			facets.push(topFacet)
		}
	},
	getCounterDirectedPolygon: function(counterClockwise, polygon) {
		if (getIsCounterclockwise(polygon) == counterClockwise) {
			return polygon
		}

		return polygon.slice(0).reverse()
	},
	getMesh: function(matrices, matrix3D, polygons, isJoined) {
		if (polygons.length == 0 || matrices.length == 0) {
			return undefined
		}

		if (matrix3D == undefined) {
			matrix3D = gUnitMatrix3D
		}

		var mesh = {facets:[], points:[]}
		var polygonGroups = getPolygonGroups(polygons)
		for (var polygonGroup of polygonGroups) {
			var polygon3DGroup = new Array(polygonGroup.length)
			polygon3DGroup[0] = getPolygon3D(this.getCounterDirectedPolygon(true, polygonGroup[0]))
			for (var polygonIndex = 1; polygonIndex < polygonGroup.length; polygonIndex++) {
				polygon3DGroup[polygonIndex] = getPolygon3D(this.getCounterDirectedPolygon(false, polygonGroup[polygonIndex]))
			}
			this.addToMesh(matrices, mesh, polygon3DGroup, isJoined)
		}

		return removeTriangulateTransform(matrix3D, mesh)
	}
}

function getBottoms(registry, statement, tops) {
	var bottoms = getFloatsByStatement('bottoms', registry, statement)
	if (arrayKit.getIsEmpty(bottoms)) {
		bottoms = [0.0]
	}
	var oldBottomLength = bottoms.length
	if (oldBottomLength < tops.length) {
		bottoms.length = tops.length
		for (var bottomIndex = oldBottomLength; bottomIndex < tops.length; bottomIndex++) {
			bottoms[bottomIndex] = bottoms[oldBottomLength - 1]
		}
	}
	return bottoms
}

function getHorizontalFacetIndexes(mesh) {
	var facets = mesh.facets
	var horizontalFacetIndexes = []
	var points = mesh.points
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var facet = facets[facetIndex]
		var addToFacets = true
		var z = points[facet[0]][2]
		for (var vertexIndex = 1; vertexIndex < facet.length; vertexIndex++) {
			if (points[facet[vertexIndex]][2] != z) {
				addToFacets = false
				break
			}
		}
		if (addToFacets) {
			horizontalFacetIndexes.push(facetIndex)
		}
	}
	return horizontalFacetIndexes
}

function getPlankMesh(heights, id, length) {
	if (length < 1) {
		return null
	}
	var points = []
	var mesh = {facets:[], points:points}
	var numberOfIntervals = length + 1
	var bottom = heights[0]
	var top = heights[heights.length - 1]
	var polygon = [[0.0, bottom, 0.0], [0.0, top, 0.0], [1.0, top, 0.0], [1.0, bottom, 0.0]]
	var zs = new Array(numberOfIntervals)
	for (var intervalIndex = 0; intervalIndex < numberOfIntervals; intervalIndex++) {
		zs[intervalIndex] = intervalIndex
	}
	extrusion.addToMesh(zs, mesh, [polygon])
	//y>z x>y z>x
	for (var point of points) {
		var x = point[0]
		point[0] = point[2]
		point[2] = point[1]
		point[1] = x
	}
	var betweenHeights = heights.slice(1, -1)
	addSplitIndexes(id, betweenHeights, mesh)
	return mesh
}

function getPolyhedronMesh(matrix3D, outsideness, radius, sides) {
	var center = [0.0, 0.0]
	if (sides == 4) {
		var layers = [{polygons:[getRegularPolygon(center, 1.0, true, radius, 0.75, 3, 0.0)]}]
		layers.push({matrix3D:Math.sqrt(8.0) * radius, polygons:[[center]], vertical:false})
		return sculpture.getMesh(layers, matrix3D)
	}

	if (sides == 8) {
		var middleHeight = Math.sqrt(2.0) * radius
		var layers = [{polygons:[[center]]}]
		layers.push({matrix3D:middleHeight, polygons:[getRegularPolygon(center, 1.0, true, radius, 0.5, 4, 0.0)], vertical:false})
		layers.push({matrix3D:2.0 * middleHeight, polygons:[[center]]})
		return sculpture.getMesh(layers, matrix3D)
	}

	if (sides == 12) {
		var bottom = getRegularPolygon(center, 1.0, true, radius, 0.0, 5, 0.0)
		var leftX = bottom[2][0]
		var leftY = bottom[2][1]
		var rightX = bottom[0][0]
		var lowerMiddleMultiplier = bottom[1][1] / leftY
		var lowerPentagon = getRegularPolygon(center, 1.0, true, radius * lowerMiddleMultiplier, 0.0, 5, 0.0)
		var lowerPentagonTurned = getRegularPolygon(center, 1.0, true, radius * lowerMiddleMultiplier, 0.5, 5, 0.0)
		var outward = lowerPentagon[0][0] - rightX
		var lowerMiddleHeight = Math.sqrt(4.0 * leftY * leftY - outward * outward)
		var upperMiddleHeight = lowerMiddleHeight * (rightX - leftX) / (bottom[1][0] - leftX)
		var middle = new Array(10)
		for (var vertexIndex = 0; vertexIndex < 5; vertexIndex++) {
			var doubleIndex = vertexIndex + vertexIndex
			middle[doubleIndex] = lowerPentagon[vertexIndex].slice(0)
			middle[doubleIndex].push(lowerMiddleHeight)
			middle[doubleIndex + 1] = lowerPentagonTurned[vertexIndex].slice(0)
			middle[doubleIndex + 1].push(upperMiddleHeight)
		}
		var upper = getRegularPolygon(center, 1.0, true, radius, 0.5, 5, 0.0)
		var layers = [{polygons:[bottom]}]
		layers.push({matrix3D:0.0, polygons:[middle], vertical:false})
		layers.push({matrix3D:upperMiddleHeight + lowerMiddleHeight, polygons:[upper]})
		return polygonateMesh(sculpture.getMesh(layers, matrix3D))
	}

	if (sides == 20) {
		var middle = getRegularPolygon(center, 1.0, true, radius, 0.0, 5, 0.0)
		var leftY = middle[2][1]
		var rightX = middle[0][0]
		var middleHeight = Math.sqrt(4.0 * leftY * leftY - rightX * rightX)
		var outward = rightX + middle[2][0]
		var upperMiddleHeight = middleHeight + Math.sqrt(3.0 * leftY * leftY - outward * outward)
		var layers = [{polygons:[[center]]}]
		layers.push({matrix3D:middleHeight, polygons:[middle], vertical:false})
		layers.push({matrix3D:upperMiddleHeight, polygons:[getRegularPolygon(center, 1.0, true, radius, 0.5, 5, 0.0)]})
		layers.push({matrix3D:upperMiddleHeight + middleHeight, polygons:[[center]]})
		return sculpture.getMesh(layers, matrix3D)
	}

	return extrusion.getMesh([0.0, 2.0 * radius], matrix3D, [getRegularPolygon(center, 1.0, true, radius, 0.5, 4, 0.0)])
}

function getSkipSet(facet) {
	var arrowVertexMap = new Map()
	var skipSet = new Set()
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		var reverseStrings = [facet[(vertexIndex + 1) % facet.length], facet[vertexIndex]]
		var reverseKey = reverseStrings.join(' ')
		if (arrowVertexMap.has(reverseKey)) {
			skipSet.add(vertexIndex)
			skipSet.add(arrowVertexMap.get(reverseKey))
		}
		else {
			reverseStrings.reverse()
			arrowVertexMap.set(reverseStrings.join(' '), vertexIndex)
		}
	}

	return skipSet
}

function getTops(registry, statement) {
	return removeIdentical2DPoints(getPointsByDefault('tops', registry, statement, 'fence', [[0, 0, 20], [20, 0, 20]]))
}

function getVerticalHingeMesh
(chamferAngle, chamferOutset, fromAngle, gap, height, innerRadius, matrix3D, numberOfSides, outerRadius, stopperThickness, toAngle) {
	var center = [outerRadius, outerRadius + gap]
	var hingeRight = outerRadius * 2.0
	var polygon = spiralCenterRadius(center, outerRadius, fromAngle, toAngle, numberOfSides)
	if (Math.abs(toAngle - 180.0) > gClose) {
		var lastPoint = polygon[polygon.length - 1]
		polygon.push([0.0, lastPoint[1] + Math.tan(Math.PI * 0.5 - toAngle * gRadiansPerDegree) * lastPoint[0]])
	}

	polygon.push([0.0, 0.0])
	polygon.push([hingeRight, 0.0])
	if (Math.abs(fromAngle) > gClose) {
		var firstPoint = polygon[0]
		polygon.push([hingeRight, firstPoint[1] + Math.tan(Math.PI * 0.5 - fromAngle * gRadiansPerDegree) * (firstPoint[0] - hingeRight)])
	}

	var heights = [0, height]
	var innerPolygon = undefined
	if (innerRadius > 0.0) {
		innerPolygon = spiralCenterRadius(center, innerRadius, 360.0, 0.0, numberOfSides, undefined, true, false)
	}
	else {
		return extrusion.getMesh(heights, matrix3D, [polygon])
	}

	var chamferDepth = chamferOutset / Math.tan(0.5 * chamferAngle * gRadiansPerDegree)
	var layers = []
	var outsetPolygon = getOutsetPolygon([chamferOutset, chamferOutset], innerPolygon)
	stopperThickness = Value.getValueDefault(stopperThickness, 0.0)
	if (stopperThickness <= 0.0) {
		layers.push({matrix3D:getMatrix3DByTranslateZ([0]), polygons:[polygon, outsetPolygon], vertical:true})
		layers.push({matrix3D:getMatrix3DByTranslateZ([chamferDepth]), polygons:[polygon, innerPolygon], vertical:false})
	}
	else {
		layers.push({matrix3D:getMatrix3DByTranslateZ([0]), polygons:[polygon], vertical:true})
		layers.push({matrix3D:getMatrix3DByTranslateZ([stopperThickness]), polygons:[polygon], vertical:true})
	}

	layers.push({matrix3D:getMatrix3DByTranslateZ([height - chamferDepth]), polygons:[polygon, innerPolygon], vertical:true})
	layers.push({matrix3D:getMatrix3DByTranslateZ([height]), polygons:[polygon, outsetPolygon], vertical:false})
	return sculpture.getMesh(layers, matrix3D)
}

function getWorkMesh(registry, statement) {
	var attributeMap = statement.attributeMap
	var workMesh = getMeshByID(attributeMap.get('work'), registry)
	if (workMesh == undefined) {
		return undefined
	}

	if (getBooleanByDefault('copy', registry, statement, statement.tag, false)) {
		workMesh = getMeshCopy(workMesh)
	}

	return workMesh
}

function getWorkMeshes(registry, statement) {
	var workIDs = getStrings('work', statement)
	var shouldCopy = getBooleanByDefault('copy', registry, statement, statement.tag, false)
	var workMeshes = []
	for (var workID of workIDs) {
		var workMesh = getMeshByID(workID, registry)
		if (workMesh != undefined) {
			if (shouldCopy) {
				workMesh = getMeshCopy(workMesh)
			}
			workMeshes.push(workMesh)
		}
	}

	return workMeshes
}

function removeClosePoints(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var linkMap = new Map()
	for (var facet of facets) {
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var pointIndex = facet[vertexIndex]
			var nextPointIndex = facet[(vertexIndex + 1) % facet.length]
			if (Vector.distanceSquaredArray(points[pointIndex], points[nextPointIndex], 3) < gCloseSquared) {
				addToLinkMap(pointIndex, nextPointIndex, linkMap)
			}
		}
	}

	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var facet = facets[facetIndex]
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var pointIndex = facet[vertexIndex]
			if (linkMap.has(pointIndex)) {
				facet[vertexIndex] = getLinkTop(pointIndex, linkMap)
			}
		}
		arrayKit.removeRepeats(facet)
	}

	arrayKit.removeShortArrays(facets, 3)
}

function removeTooThinFacets(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	removeClosePoints(mesh)
	for (var whileCount = 0; whileCount < 5; whileCount++) {
		var segmentMap = new Map()
		for (var facet of facets) {
			var polygon = getPolygonByFacet(facet, points)
			var isPolygonTooThin = false
			if (getNormalByPolygon(polygon) == undefined) {
				isPolygonTooThin = true
			}
			else {
				if (getDouble3DPolygonArea(polygon) < gClose) {
					isPolygonTooThin = true
				}
			}
			if (isPolygonTooThin) {
				for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
					var pointIndex = facet[vertexIndex]
					var point = points[pointIndex]
					for (var checkIndex = vertexIndex + 1; checkIndex < vertexIndex + facet.length - 1; checkIndex++) {
						var beginPointIndex = facet[checkIndex % facet.length]
						var endPointIndex = facet[(checkIndex + 1) % facet.length]
						if (getIsXYZSegmentClose(points[beginPointIndex], points[endPointIndex], point)) {
							mapKit.addElementToMapArray(segmentMap, getEdgeKey(beginPointIndex, endPointIndex), pointIndex)
						}
					}
				}
			}
		}
		if (segmentMap.size == 0) {
			addFacetsByWorkMap(facets, getDifferenceWorkMap(facets))
			removeDeadEnds(facets)
			return
		}
		addPointsToFacets(mesh, segmentMap)
		for (var facetIndex = facets.length - 1; facetIndex > -1; facetIndex--) {
			var facet = facets[facetIndex]
			arrayKit.removeRepeats(facet)
			var pointIndexSet = new Set()
			for (var pointIndex of facet) {
				if (pointIndexSet.has(pointIndex)) {
					separateFacets = getJoinedFacets([facet])
					if (separateFacets.length == 0) {
						facets.splice(facetIndex, 1)
					}
					else {
						var joinedFacet = separateFacets[0]
						if (separateFacets.length > 1) {
							joinedFacet = getConnectedFacet(separateFacets, points)
						}
						facets[facetIndex] = joinedFacet
					}
					break
				}
				else {
					pointIndexSet.add(pointIndex)
				}
			}
		}
	}
}

function removeTriangulateTransform(matrix3D, mesh) {
	removeTooThinFacets(mesh)
	removeUnfacetedPoints(mesh)
	triangulateBentFacets(mesh)
	mesh.points = get3DsByMatrix3D(mesh.points, matrix3D)
	return mesh
}

function triangulateBentFacets(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var xyPoints = new Array(points.length)
	for (var facetIndex = facets.length - 1; facetIndex > -1; facetIndex--) {
		var facet = facets[facetIndex]
		if (facet.length > 3) {
			if (getIsPolygonBent(getPolygonByFacet(facet, points))) {
				var xyzTriangleFacets = getTriangle3DFacets(facet, points, xyPoints)
				if (xyzTriangleFacets.length == 0) {
					facets.splice(facetIndex, 1)
				}
				else {
					facets[facetIndex] = xyzTriangleFacets[0]
					for (var remainingIndex = 1; remainingIndex < xyzTriangleFacets.length; remainingIndex++) {
						facets.push(xyzTriangleFacets[remainingIndex])
					}
				}
			}
		}
	}
}

var extrusionProcessor = {
	processStatement:function(registry, statement) {
		statement.tag = 'g'
		var isJoined = getBooleanByDefault('join', registry, statement, this.tag, false)
		var matrices = getMatrices3DAndZeroHeight(registry, statement, null)
		var matrix3D = getChainMatrix3D(registry, statement)
		var polygons = getPolygonsHDRecursively(registry, statement)
		if (arrayKit.getIsEmpty(polygons)) {
			noticeByList(['No polygons could be found for extrusion in generator3d.', statement])
			return
		}

		analyzeOutputMesh(extrusion.getMesh(matrices, matrix3D, polygons, isJoined), registry, statement)
	},
	tag: 'extrusion'
}

var fenceProcessor = {
	alterMesh: function(mesh, registry, statement) {
		var tops = getTops(registry, statement)
		var bottoms = getBottoms(registry, statement, tops)
		var betweens = getFloatsByStatement('betweens', registry, statement)
		var curve = getEquation('curve', statement)
		var matrix3D = getChainMatrix3D(registry, statement)
		convertPlankToFence(betweens, bottoms, curve, null, mesh, registry, statement, tops)
	},
	processStatement:function(registry, statement) {
		var heights = getHeights(registry, statement, this.tag)
		var tops = getTops(registry, statement)
		var mesh = getPlankMesh(heights, statement.attributeMap.get('id'), tops.length - 1)
		var bottoms = getBottoms(registry, statement, tops)
		var overhangAngle = getFloatByDefault('overhangAngle', registry, statement, this.tag, 40.0) * gRadiansPerDegree
		var thickness = getFloatByDefault('thickness', registry, statement, this.tag, 2.0)
		var width = getFloatByDefault('width', registry, statement, this.tag, 10.0)
		addHolesToFence(bottoms, mesh, overhangAngle, thickness, tops, width)
		this.alterMesh(mesh, registry, statement)
		analyzeOutputMesh(mesh, registry, statement)
	},
	tag: 'fence'
}

var plankProcessor = {
	processStatement:function(registry, statement) {
		var length = getIntByDefault('length', registry, statement, this.tag, 1)
		var heights = getHeights(registry, statement, this.tag)
		var matrix3D = getChainMatrix3D(registry, statement)
		var mesh = getPlankMesh(heights, statement.attributeMap.get('id'), length)
		mesh.points = get3DsByMatrix3D(mesh.points, matrix3D)
		analyzeOutputMesh(mesh, registry, statement)
	},
	tag: 'plank'
}

var polyhedronProcessor = {
	processStatement:function(registry, statement) {
		var matrix3D = getChainMatrix3D(registry, statement)
		var outsideness = getFloatByDefault('outsideness', registry, statement, this.tag, 1.0)

//deprecated25
		var radius = getFloatByDefault('radius', registry, statement, this.tag, 1.0)
		radius = getFloatByDefault('r', registry, statement, this.tag, radius)

		var sideOffset = getFloatByDefault('sideOffset', registry, statement, this.tag, 0.0)
		var sides = getIntByDefault('sides', registry, statement, this.tag, 24)
		analyzeOutputMesh(getPolyhedronMesh(matrix3D, outsideness, radius, sides), registry, statement)
	},
	tag: 'polyhedron'
}

var roadProcessor = {
	alterMesh: function(mesh, registry, statement) {
		var betweens = getFloatsByStatement('betweens', registry, statement)
		var centers = getPointsByDefault('centers', registry, statement, 'road', [[0, 0, 2], [10, 0]])
		var curve = getEquation('curve', statement)
		var matrix3D = getChainMatrix3D(registry, statement)
		convertPlankToRoad(betweens, centers, curve, matrix3D, mesh, registry, statement)
	},
	processStatement:function(registry, statement) {
		var centers = getPointsByDefault('centers', registry, statement, 'road', [[0, 0, 2], [10, 0]])
		var heights = getHeights(registry, statement, this.tag)
		var mesh = getPlankMesh(heights, statement.attributeMap.get('id'), centers.length - 1)
		this.alterMesh(mesh, registry, statement)
		analyzeOutputMesh(mesh, registry, statement)
	},
	tag: 'road'
}

var sculpture = {
	addArrowMapToHorizontalFacets: function(aboveIndex, arrowMaps, pointLayerMap, points) {
		var startMap = arrowMaps[aboveIndex]
		for (var key of startMap.keys()) {
			if (startMap.get(key) != null) {
				var facet = []
				var pathIndex = aboveIndex
				var pathKey = key
				var pathMap = startMap
				while (facet.length < gLengthLimit) {
					nextKey = pathMap.get(pathKey)
					if (nextKey == null) {
						var layer = pointLayerMap.get(facet[0]).horizontalFacets.push(facet)
						break
					}
					else {
						facet.push(pathKey)
						pathMap.set(pathKey, null)
						pathKey = nextKey
					}
					var alternateIndex = 1 - pathIndex
					if (arrowMaps[alternateIndex].has(pathKey)) {
						pathIndex = alternateIndex
						pathMap = arrowMaps[alternateIndex]
					}
				}
			}
		}
	},
	addFacetsAlongLoneEdges: function(layers, mesh, pointLayerMap) {
		var arrowMaps = [new Map(), new Map()]
		var facets = mesh.facets
		var points = mesh.points
		var arrowSet = getLoneArrowSet(facets)
		for (var facet of facets) {
			var lowIndex = Number.MAX_VALUE
			var highIndex = -Number.MAX_VALUE
			for (var pointIndex of facet) {
				var layerIndex = pointLayerMap.get(pointIndex).index
				lowIndex = Math.min(lowIndex, layerIndex)
				highIndex = Math.max(highIndex, layerIndex)
			}
			for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
				var pointIndex = facet[vertexIndex]
				var nextPointIndex = facet[(vertexIndex + 1) % facet.length]
				if (arrowSet.has(pointIndex.toString() + ' ' + nextPointIndex.toString())) {
					if (pointLayerMap.get(pointIndex).index == lowIndex) {
						arrowMaps[0].set(nextPointIndex, pointIndex)
					}
					else {
						arrowMaps[1].set(nextPointIndex, pointIndex)
					}
				}
			}
		}

		this.addArrowMapToHorizontalFacets(0, arrowMaps, pointLayerMap, points)
		this.addArrowMapToHorizontalFacets(1, arrowMaps, pointLayerMap, points)
		for (var layer of layers) {
			var facetGroups = getFacetGroups(layer.horizontalFacets, points)
			for (var facetGroup of facetGroups) {
				facets.push(getConnectedFacet(facetGroup, points))
			}
		}
	},
	addOrJoinFacet: function(arrowHigh, arrowLow, arrowMap, facets, points) {
		arrowMap.set(arrowHigh.join(' '), facets.length)
		var joinedFacets = []
		var shortestIndex = 0
		if (arrowHigh.length > 1) {
			var shortestDiagonalLength = Number.MAX_VALUE
			var arrowHighZeroPoint = points[arrowHigh[0]]
			var arrowHighOnePoint = points[arrowHigh[1]]
			for (var vertexIndex = 0; vertexIndex < arrowLow.length; vertexIndex++) {
				var point = points[arrowLow[vertexIndex]]
				var diagonalLength = Math.max(Vector.distanceSquared2D(point, arrowHighZeroPoint), Vector.distanceSquared2D(point, arrowHighOnePoint))
				if (diagonalLength < shortestDiagonalLength) {
					shortestDiagonalLength = diagonalLength
					shortestIndex = vertexIndex
				}
			}
			joinedFacets.push(arrowHigh.concat(arrowLow[shortestIndex]))
		}

		for (var vertexIndex = 0; vertexIndex < shortestIndex; vertexIndex++) {
			var facet = arrowLow.slice(vertexIndex, vertexIndex + 2)
			facet.push(arrowHigh[arrowHigh.length - 1])
			joinedFacets.push(facet)
		}

		for (var vertexIndex = shortestIndex; vertexIndex < arrowLow.length - 1; vertexIndex++) {
			var facet = arrowLow.slice(vertexIndex, vertexIndex + 2)
			facet.push(arrowHigh[0])
			joinedFacets.push(facet)
		}

		polygonateFacets(joinedFacets, points)
		arrayKit.pushArray(facets, joinedFacets)
	},
	addPointToLayer: function(layer, point, pointLayerMap, points, sculptureObject, topFacet) {
		layer.pointIndexes.push(points.length)
		pointLayerMap.set(points.length, layer)
		topFacet.push(points.length)
		points.push(point)
		point[2] += layer.index
	},
	addPolygonsToLayer: function(id, layer, previousLayer, registry, sculptureObject) {
		var statement = undefined
		if (sculptureObject.statementMap != undefined) {
			statement = sculptureObject.statementMap.get(id)
		}

		var connectionMultiplier = layer.connectionMultiplier
		var connectionIDs = undefined
		var vertical = layer.vertical
		var polygons = sculptureObject.polygonMap.get(id)
		var isClockwise = getIsClockwise(polygons[0])
		if (statement != undefined) {
			connectionMultiplier = Value.getValueDefault(getFloatByStatement('connectionMultiplier', registry, statement), connectionMultiplier)
			var connectionIDs = statement.attributeMap.get('connectionID')
			if (connectionIDs != undefined) {
				connectionIDs = connectionIDs.replaceAll(',', ' ').split(' ').filter(lengthCheck)
			}
			vertical = Value.getValueDefault(getBooleanByStatement('vertical', registry, statement), vertical)
			if (polygons[0].length < 3) {
				isClockwise = Value.getValueFalse(getBooleanByStatement('clockwise', registry, statement))
			}
		}

		for (var polygon of polygons) {
			this.addPolygonToLayer(
			connectionIDs, connectionMultiplier, id, isClockwise, layer, polygon, previousLayer, sculptureObject, vertical)
		}
	},
	addPolygonToLayer: function(connectionIDs, connectionMultiplier, id, isClockwise, layer, polygon, previousLayer, sculptureObject, vertical) {
		var connectionFacet = []
		var facetsMap = sculptureObject.facetsMapDirections[1 * isClockwise]
		var mesh = sculptureObject.mesh
		var pointLayerMap = sculptureObject.pointLayerMap
		var oldTopFacets = []
		var points = mesh.points
		if (connectionIDs == undefined) {
			for (var previousID of previousLayer.ids) {
				arrayKit.pushArray(oldTopFacets, facetsMap.get(previousID))
			}
		}
		else {
			for (var connectionID of connectionIDs) {
				arrayKit.pushArray(oldTopFacets, sculptureObject.facetsMapDirections[0].get(connectionID))
				arrayKit.pushArray(oldTopFacets, sculptureObject.facetsMapDirections[1].get(connectionID))
			}
			if (oldTopFacets.length > 0) {
				if (oldTopFacets[0].length > 0) {
					previousLayer = pointLayerMap.get(oldTopFacets[0][0])
				}
			}
		}

		var oldGridMap = undefined
		var topFacet = []
		if (vertical) {
			var alongIndexesMap = new Map()
			var meetingMap = new Map()
			for (var previousID of previousLayer.ids) {
				var previousPolygons = sculptureObject.polygonMap.get(previousID)
				for (var previousPolygon of previousPolygons) {
					addMeetingsByPolygon(alongIndexesMap, meetingMap, previousPolygon, polygon)
				}
			}
			oldGridMap = new Map()
			for (var facet of oldTopFacets) {
				for (var pointIndex of facet) {
					addPointIndexToGridMapArray(oldGridMap, gHalfMinusOver, points[pointIndex], pointIndex)
				}
			}
			sortAlongIndexesMap(alongIndexesMap)
			for (var vertexIndex = polygon.length - 1; vertexIndex > -1; vertexIndex--) {
				var key = 'w ' + vertexIndex.toString()
				if (alongIndexesMap.has(key)) {
					var alongIndexes = alongIndexesMap.get(key)
					for (var alongIndexIndex = alongIndexes.length - 1; alongIndexIndex > -1; alongIndexIndex--) {
						var meeting = meetingMap.get(alongIndexes[alongIndexIndex][1])
						if (!meeting.isWorkNode) {
							polygon.splice(vertexIndex + 1, 0, meeting.point)
						}
					}
				}
			}
		}

		removeIdentical2DPoints(polygon)
		var polygon3D = getPolygon3D(polygon, 0.0)
		for (var vertexIndex = 0; vertexIndex < polygon3D.length; vertexIndex++) {
			var point = polygon3D[vertexIndex]
			if (vertical) {
				this.addToVerticalConnection(connectionFacet, mesh, oldGridMap, point, pointLayerMap, previousLayer)
			}
			else {
				this.addToSlopedConnection(connectionFacet, connectionMultiplier, oldTopFacets, point, points, polygon3D, vertexIndex)
			}
			this.addPointToLayer(layer, point, pointLayerMap, points, sculptureObject, topFacet)
		}

		if (vertical) {
			for (var connectionIndex = 0; connectionIndex < connectionFacet.length; connectionIndex++) {
				this.addVerticalSculptureFacets(connectionFacet, connectionIndex, layer, mesh, oldTopFacets, points)
			}
		}
		else {
			if (connectionFacet.length > 2) {
				for (var connectionIndex = 0; connectionIndex < connectionFacet.length * 2; connectionIndex++) {
					this.containOutsideConnection(connectionFacet, connectionIndex % connectionFacet.length, oldTopFacets)
				}
			}
			for (var connectionIndex = 0; connectionIndex < connectionFacet.length; connectionIndex++) {
				this.addSlopedSculptureFacets(connectionFacet, connectionIndex, layer, mesh, oldTopFacets, points, polygon3D)
			}
		}

		mapKit.addElementToMapArray(facetsMap, id, topFacet)
	},
	addSlopedSculptureFacets: function(connectionFacet, connectionIndex, layer, mesh, oldTopFacets, points, polygon3D) {
		var connection = connectionFacet[connectionIndex]
		var nextConnection = connectionFacet[(connectionIndex + 1) % connectionFacet.length]
		var arrowLow = [connection.low]
		if (connection.topFacetIndex == nextConnection.topFacetIndex) {
			var oldTopFacet = oldTopFacets[connection.topFacetIndex]
			var topFacetLength = oldTopFacet.length
			for (var extraIndex = 0; extraIndex < topFacetLength; extraIndex++) {
				var totalIndex = (connection.vertexIndex + extraIndex) % topFacetLength
				if (totalIndex == nextConnection.vertexIndex && polygon3D.length > 1) {
					break
				}
				arrowLow.push(oldTopFacet[(totalIndex + 1) % topFacetLength])
			}
		}
		else {
			arrowLow.push(nextConnection.low)
		}

		var arrowHigh = [nextConnection.high]
		if (connection.high != nextConnection.high) {
			arrowHigh.push(connection.high)
		}

		this.addOrJoinFacet(arrowHigh, arrowLow, layer.arrowMap, mesh.facets, points)
	},
	addToSlopedConnection: function(connectionFacet, connectionMultiplier, oldTopFacets, point, points, polygon3D, vertexIndex) {
		var centerBegin = undefined
		var centerEnd = undefined
		var beginPoint = polygon3D[(vertexIndex - 1 + polygon3D.length) % polygon3D.length]
		var endPoint = polygon3D[(vertexIndex + 1) % polygon3D.length]
		var centerBegin = normalize2D(Vector.getSubtraction2D(beginPoint, point))
		var centerEnd = normalize2D(Vector.getSubtraction2D(endPoint, point))

		var closestIndex = undefined
		var closestTopFacetIndex = undefined
		var closestVertexIndex = undefined
		var leastDistanceSquared = Number.MAX_VALUE
		for (var topFacetIndex = 0; topFacetIndex < oldTopFacets.length; topFacetIndex++) {
			var topFacet = oldTopFacets[topFacetIndex]
			for (var vertexIndex = 0; vertexIndex < topFacet.length; vertexIndex++) {
				var pointIndex = topFacet[vertexIndex]
				var centerPoint = points[pointIndex]
				var distanceSquared = Vector.distanceSquared2D(point, centerPoint)
				var beginPoint = points[topFacet[(vertexIndex - 1 + topFacet.length) % topFacet.length]]
				var endPoint = points[topFacet[(vertexIndex + 1) % topFacet.length]]
				var oldCenterBegin = normalize2D(Vector.getSubtraction2D(beginPoint, centerPoint))
				var oldCenterEnd = normalize2D(Vector.getSubtraction2D(endPoint, centerPoint))
				var dotBegin = Math.max(Math.min(Vector.dotProduct2D(centerBegin, oldCenterBegin), 1.0), -1.0)
				var dotEnd = Math.max(Math.min(Vector.dotProduct2D(centerEnd, oldCenterEnd), 1.0), -1.0)
				distanceSquared *= 1.0 + (Math.acos(dotBegin) + Math.acos(dotEnd)) * connectionMultiplier
				var shouldSetClosest = distanceSquared < leastDistanceSquared
				if (shouldSetClosest) {
					leastDistanceSquared = distanceSquared
					closestIndex = pointIndex
					closestTopFacetIndex = topFacetIndex
					closestVertexIndex = vertexIndex
				}
			}
		}

		if (closestTopFacetIndex == undefined) {
			return
		}

		connectionFacet.push({low:closestIndex, high:points.length, topFacetIndex:closestTopFacetIndex, vertexIndex:closestVertexIndex})
	},
	addToVerticalConnection: function(connectionFacet, mesh, oldGridMap, point, pointLayerMap, previousLayer) {
		var oldArrowMap = previousLayer.arrowMap
		var points = mesh.points
		var closestIndex = getClosePointIndexOrNull(oldGridMap, point, points)
		if (closestIndex == null) {
			var lowPoint = [point[0], point[1], 0.0]
			closestIndex = points.length
			pointLayerMap.set(closestIndex, previousLayer)
			previousLayer.pointIndexes.push(closestIndex)
			points.push(lowPoint)
			lowPoint[2] += previousLayer.index
			for (var arrowKey of oldArrowMap.keys()) {
				var arrowString = arrowKey.split(' ')
				var beginIndex = parseInt(arrowString[0])
				var endIndex = parseInt(arrowString[1])
				if (getIsXYSegmentClose(points[beginIndex], points[endIndex], point)) {
					connectionFacet.push({low:closestIndex, high:points.length})
					var facetIndex = oldArrowMap.get(arrowKey)
					var facet = mesh.facets[facetIndex]
					oldArrowMap.delete(arrowKey)
					oldArrowMap.set(beginIndex.toString() + ' ' + closestIndex.toString(), facetIndex)
					oldArrowMap.set(closestIndex.toString() + ' ' + endIndex.toString(), facetIndex)
					for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
						if (facet[vertexIndex] == endIndex) {
							facet.splice(vertexIndex, 0, closestIndex)
							return
						}
					}
					return
				}
			}
		}
		connectionFacet.push({low:closestIndex, high:points.length})
	},
	addVerticalSculptureFacets: function(connectionFacet, connectionIndex, layer, mesh, oldTopFacets, points) {
		var connection = connectionFacet[connectionIndex]
		var nextConnection = connectionFacet[(connectionIndex + 1) % connectionFacet.length]
		var arrowLow = [connection.low]
		var connectionPoint = points[connection.low]
		var nextConnectionPoint = points[nextConnection.low]
		var delta = normalize2D(Vector.getSubtraction2D(nextConnectionPoint, connectionPoint))
		var reverseRotation = [delta[0], -delta[1]]
		var nextRotated = Vector.getRotation2DVector(connectionPoint, reverseRotation)
		var rotatedX = nextConnectionPoint[0] * reverseRotation[0] - nextConnectionPoint[1] * reverseRotation[1]
		var segmentIndexes = []
		for (var oldTopFacet of oldTopFacets) {
			for (var pointIndex of oldTopFacet) {
				var point = points[pointIndex]
				var pointRotated = Vector.getRotation2DVector(point, reverseRotation)
				if (Math.abs(pointRotated[1] - nextRotated[1]) < gHalfClose) {
					if (Vector.distanceSquared2D(point, connectionPoint) > gCloseSquared) {
						if (Vector.distanceSquared2D(point, nextConnectionPoint) > gCloseSquared) {
							if (pointRotated[0] > nextRotated[0] && pointRotated[0] < rotatedX) {
								var nextVector = normalize2D(Vector.getSubtraction2D(nextConnectionPoint, connectionPoint))
								segmentIndexes.push([Vector.dotProduct2D(nextVector, point), pointIndex])
							}
						}
					}
				}
			}
		}
		segmentIndexes.sort(arrayKit.compareElementZeroAscending)
		for (var segmentIndexIndex = 0; segmentIndexIndex < segmentIndexes.length; segmentIndexIndex++) {
			segmentIndexes[segmentIndexIndex] = segmentIndexes[segmentIndexIndex][1]
		}
		arrayKit.pushArray(arrowLow, segmentIndexes)
		arrowLow.push(nextConnection.low)
		this.addOrJoinFacet([nextConnection.high, connection.high], arrowLow, layer.arrowMap, mesh.facets, points)
	},
	connectionMultiplier: 10.0,
	containOutsideConnection: function(connectionFacet, connectionIndex, oldTopFacets) {
		var begin = connectionFacet[connectionIndex]
		var center = connectionFacet[(connectionIndex + 1) % connectionFacet.length]
		if (begin.topFacetIndex == center.topFacetIndex) {
			var oldTopFacet = oldTopFacets[begin.topFacetIndex]
			var facetLength = oldTopFacet.length
			var centerVertexIndex = center.vertexIndex
			if (centerVertexIndex < begin.vertexIndex) {
				centerVertexIndex += facetLength
			}
			if ((centerVertexIndex - begin.vertexIndex) > facetLength * 0.45) {
				center.vertexIndex = begin.vertexIndex
				center.low = oldTopFacet[center.vertexIndex]
			}
		}
	},
	getMesh: function(layers, matrix3D, registry, sculptureObject) {
		if (matrix3D == undefined) {
			matrix3D = getUnitMatrix3D()
		}

		if (sculptureObject == undefined) {
			sculptureObject = {polygonMap:new Map()}
		}

		sculptureObject.facetsMapDirections = [new Map(), new Map()]
		var oldConnectionMultiplier = this.connectionMultiplier
		var oldVertical = true
		var oldMatrix3D = -1.0	// because layer.matrix3D.. + .. 1.0
		for (var layer of layers) {
			layer.pointIndexes = []
			if (layer.polygons != undefined) {
				if (layer.ids == undefined) {
					layer.ids = []
				}
				for (var polygon of layer.polygons) {
					var id = sculptureObject.polygonMap.size.toString()
					layer.ids.push(id)
					sculptureObject.polygonMap.set(id, polygon)
				}
			}
			layer.connectionMultiplier = Value.getValueDefault(layer.connectionMultiplier, oldConnectionMultiplier)
			layer.vertical = Value.getValueDefault(layer.vertical, oldVertical)
			oldConnectionMultiplier = layer.connectionMultiplier
			oldVertical = layer.vertical
			if (layer.matrix3D == undefined) {
				if (Array.isArray(oldMatrix3D)) {
					layer.matrix3D = oldMatrix3D.slice(0)
					layer.matrix3D[14] += 1.0
				}
				else {
					layer.matrix3D = oldMatrix3D + 1.0
				}
			}
			oldMatrix3D = layer.matrix3D
		}

		for (var key of sculptureObject.polygonMap.keys()) {
			var separatedPolygons = getSeparatedPolygons(sculptureObject.polygonMap.get(key))
			for (var separatedPolygon of separatedPolygons) {
				removeIdentical2DPoints(separatedPolygon)

				if (sculptureObject.clockwisePositive == true) {
					separatedPolygon.reverse()
				}
			}
			sculptureObject.polygonMap.set(key, separatedPolygons)
		}

		var mesh = {facets:[], points:[]}
		var pointLayerMap = new Map()
		sculptureObject.mesh = mesh
		sculptureObject.pointLayerMap = pointLayerMap
		var points = mesh.points
		var layer = layers[0]
		layer.arrowMap = new Map()
		layer.horizontalFacets = []
		layer.index = 0
		for (var id of layer.ids) {
			var polygons = sculptureObject.polygonMap.get(id)
			for (var polygon of polygons) {
				var isClockwise = getIsClockwise(polygon)
				if (sculptureObject.statementMap != undefined) {
					statement = sculptureObject.statementMap.get(id)
					if (statement != undefined && polygon.length < 3) {
						isClockwise = Value.getValueFalse(getBooleanByStatement('clockwise', registry, statement))
					}
				}
				var polygon3D = getPolygon3D(polygon, 0.0)
				var topFacet = []
				for (var vertexIndex = 0; vertexIndex < polygon3D.length; vertexIndex++) {
					this.addPointToLayer(layer, polygon3D[vertexIndex], pointLayerMap, points, sculptureObject, topFacet)
				}
				mapKit.addElementToMapArray(sculptureObject.facetsMapDirections[1 * isClockwise], id, topFacet)
			}
		}

		for (var layerIndex = 1; layerIndex < layers.length; layerIndex++) {
			var layer = layers[layerIndex]
			layer.arrowMap = new Map()
			layer.horizontalFacets = []
			layer.index = layerIndex
			var previousLayer = layers[layerIndex - 1]
			for (var id of layer.ids) {
				this.addPolygonsToLayer(id, layer, previousLayer, registry, sculptureObject)
			}
		}

		for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
			var layer = pointLayerMap.get(pointIndex)
			points[pointIndex][2] -= layer.index
			points[pointIndex] = get3DByHeightMatrix3D(points[pointIndex], layer.matrix3D)
		}

		this.addFacetsAlongLoneEdges(layers, mesh, pointLayerMap)
		return removeTriangulateTransform(matrix3D, mesh)
	}
}

var sculptureProcessor = {
	getNewSculptureID: function(id, polygonMap) {
		var whileCount = 2
		if (this.idCountMap.has(id)) {
			whileCount = this.idCountMap.get(id) + 1
		}

		for (; whileCount < gLengthLimit; whileCount++) {
			var check = id + '_' + whileCount.toString()
			if (!polygonMap.has(check)) {
				this.idCountMap.set(id, whileCount)
				return check
			}
		}
	},
	processStatement:function(registry, statement) {
		convertToGroupIfParent(statement)
		var connectionMultiplier = sculpture.connectionMultiplier
		var sculptureObject = {polygonMap:new Map(), statementMap:new Map()}
		sculptureObject.clockwisePositive = getBooleanByStatement('clockwisePositive', registry, statement)
		this.idCountMap = new Map()
		var layerMap = new Map()
		var layers = []
		for (var child of statement.children) {
			if (child.tag == 'layer') {
				connectionMultiplier = Value.getValueDefault(getFloatByStatement('connectionMultiplier', registry, child), connectionMultiplier)
				var childMatrices = getMatrices3D(registry, child, null)
				if (childMatrices.length == 0) {
					childMatrices.push(0.0)
				}
				var polygonStatements = getPolygonStatementsRecursively(registry, child, 1)
				var vertical = getBooleanByStatement('vertical', registry, child)
				var id = child.attributeMap.get('id')
				var workIDs = getStrings('work', child)
				for (var count = 0; count < childMatrices.length; count++) {
					var layer = undefined
					if (workIDs.length > 0) {
						var layerID = workIDs[count % workIDs.length]
						if (layerMap.has(layerID)) {
							var oldLayer = layerMap.get(layerID)
							var oldIDs = oldLayer.ids
							var newIDs = new Array(oldIDs.length)
							for (var newIDIndex = 0; newIDIndex < newIDs.length; newIDIndex++) {
								var oldID = oldIDs[newIDIndex]
								var newID = this.getNewSculptureID(oldID, sculptureObject.polygonMap)
								newIDs[newIDIndex] = newID
								sculptureObject.polygonMap.set(newID, arrayKit.getArraysCopy(sculptureObject.polygonMap.get(oldID)))
								sculptureObject.statementMap.set(newID, sculptureObject.statementMap.get(oldID))
							}
							layer = {connectionMultiplier:oldLayer.connectionMultiplier, ids:newIDs, vertical:oldLayer.vertical}
						}
						else {
							noticeByList(['No layer could be found for sculpture in generator3d.', layerID, child, statement])
						}
					}
					else {
						var ids = []
						var layerPolygons = []
						for (var polygonStatement of polygonStatements) {
							var polygonStatementID = polygonStatement.statement.attributeMap.get('id')
							var points = polygonStatement.points
							if (sculptureObject.polygonMap.has(polygonStatementID)) {
								polygonStatementID = this.getNewSculptureID(polygonStatementID, sculptureObject.polygonMap)
								points = arrayKit.getArraysCopy(points)
							}
							sculptureObject.polygonMap.set(polygonStatementID, points)
							sculptureObject.statementMap.set(polygonStatementID, polygonStatement.statement)
							ids.push(polygonStatementID)
						}
						layer = {connectionMultiplier:connectionMultiplier, ids:ids, vertical:vertical}
					}
					if (layer != undefined) {
						layer.matrix3D = childMatrices[count]
						layerMap.set(id, layer)
						layers.push(layer)
					}
				}
				convertToGroupIfParent(child)
			}
		}
		if (layers.length < 2) {
			noticeByList(['Less than 2 layers could be found for sculpture in generator3d.', statement])
			return
		}
		var matrix3D = getChainMatrix3D(registry, statement)
		analyzeOutputMesh(sculpture.getMesh(layers, matrix3D, registry, sculptureObject), registry, statement)
	},
	tag: 'sculpture'
}

var verticalHingeProcessor = {
	processStatement:function(registry, statement) {
		var chamferAngle = getFloatByDefault('chamferAngle', registry, statement, this.tag, 90.0)
		var chamferOutset = getFloatByDefault('chamferOutset', registry, statement, this.tag, 1.0)
		var fromAngle = getFloatByDefault('fromAngle', registry, statement, this.tag, 0.0)
		var gap = getFloatByDefault('gap', registry, statement, this.tag, 0.0)
		var height = getFloatByDefault('height', registry, statement, this.tag, 10.0)
		var innerRadius = getFloatByDefault('innerRadius', registry, statement, this.tag, 5.0)
		var matrix3D = getChainMatrix3D(registry, statement)
		var numberOfSides = getFloatByDefault('sides', registry, statement, this.tag, 48.0)
		var outerRadius = getFloatByDefault('outerRadius', registry, statement, this.tag, 10.0)
		var stopperThickness = getFloatByDefault('stopperThickness', registry, statement, this.tag, 0.0)
		var toAngle = getFloatByDefault('toAngle', registry, statement, this.tag, 180.0)
		var verticalHingeMesh = getVerticalHingeMesh(
		chamferAngle, chamferOutset, fromAngle, gap, height, innerRadius, matrix3D, numberOfSides, outerRadius, stopperThickness, toAngle)
		analyzeOutputMesh(verticalHingeMesh, registry, statement)
	},
	tag: 'verticalHinge'
}

var gGenerator3DProcessors = [
extrusionProcessor, fenceProcessor, plankProcessor, polyhedronProcessor, roadProcessor, sculptureProcessor, verticalHingeProcessor]
