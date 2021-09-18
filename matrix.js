//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

gRGBIndex = 0
const gXYRotationBasis = [0, 1]
const gYZRotationBasis = [1, 2]
const gXZRotationBasis = [0, 2]

function addArray(elements, elementsAddition) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		elements[elementIndex] += elementsAddition[elementIndex]
	}
	return elements
}

function addXY(xy, xyAddition) {
	xy[0] += xyAddition[0]
	xy[1] += xyAddition[1]
	return xy
}

function addXYArraysByXY(arrays, xy) {
	for (var array of arrays) {
		addXYsByXY(array, xy)
	}
	return arrays
}

function addXYArraysByY(arrays, y) {
	for (var array of arrays) {
		addXYsByY(array, y)
	}
	return arrays
}

function addXYsByXY(xys, xy) {
	for (var element of xys) {
		element[0] += xy[0]
		element[1] += xy[1]
	}
	return xys
}

function addXYsByY(xys, y) {
	for (var xy of xys) {
		xy[1] += y
	}
	return xys
}

function addXYZsByZ(xyzs, z) {
	for (var xyz of xyzs) {
		xyz[2] += z
	}
	return xyzs
}

function addXYZ(xyz, xyzAddition) {
	xyz[0] += xyzAddition[0]
	xyz[1] += xyzAddition[1]
	xyz[2] += xyzAddition[2]
	return xyz
}

function divideXYByScalar(xy, scalarDivisor) {
	xy[0] /= scalarDivisor
	xy[1] /= scalarDivisor
	return xy
}

function divideXYZByScalar(xyz, scalarDivisor) {
	xyz[0] /= scalarDivisor
	xyz[1] /= scalarDivisor
	xyz[2] /= scalarDivisor
	return xyz
}

function get2DTransformByMatrix(floats) {
	return floats
}

function get2DTransformByPlane(floats) {
	var latestMatrix = get2DUnitMatrix()
	if (floats.length == 0) {
		return latestMatrix
	}
//	a c e		0 2 4
//	b d f		1 3 5
//	0 0 1		    +
	latestMatrix[4] = floats[0]
	if (floats.length == 1) {
		latestMatrix[5] = 0.0
	}
	else {
		latestMatrix[5] = floats[1]
	}
	if (floats.length < 3) {
		return latestMatrix
	}
	latestMatrix[0] = floats[2]
	latestMatrix[1] = floats[3]
	if (floats.length == 4) {
		latestMatrix[2] = -latestMatrix[1]
		latestMatrix[3] = latestMatrix[0]
	}
	else {
		latestMatrix[2] = floats[4]
		latestMatrix[3] = floats[5]
	}
	return latestMatrix
}

function get2DTransformByPolar(floats) {
	var latestMatrix = get2DUnitMatrix()
	if (floats.length == 0) {
		return latestMatrix
	}
//	a c e		0 2 4
//	b d f		1 3 5
//	0 0 1		    +
	latestMatrix[4] = floats[0]
	if (floats.length == 1) {
		latestMatrix[5] = 0.0
	}
	else {
		latestMatrix[5] = floats[1]
	}
	if (floats.length < 3) {
		return latestMatrix
	}
	var rotation = floats[2] * gRadiansPerDegree
	var cosAngle = Math.cos(rotation)
	var sinAngle = Math.sin(rotation)
	latestMatrix[0] = cosAngle
	latestMatrix[1] = sinAngle
	latestMatrix[2] = -sinAngle
	latestMatrix[3] = cosAngle
	if (floats.length < 4) {
		return latestMatrix
	}
	var scale = floats[3]
	latestMatrix[0] *= scale
	latestMatrix[1] *= scale
	latestMatrix[2] *= scale
	latestMatrix[3] *= scale
	return latestMatrix
}

function get2DTransformByRotate(floats) {
	if (floats.length == 0) {
		return get2DUnitMatrix()
	}
	var rotation = floats[0] * gRadiansPerDegree
	var cosAngle = Math.cos(rotation)
	var sinAngle = Math.sin(rotation)
//	a c e		0 2 4
//	b d f		1 3 5
//	0 0 1		    +
//
//	cos -sin
//	sin cos
	var latestMatrix = [cosAngle, sinAngle, -sinAngle, cosAngle, 0.0, 0.0]
	if (floats.length < 2) {
		return latestMatrix
	}
	var x = 0.0
	var y = 0.0
	if (floats.length > 1) {
		x = floats[1]
	}
	if (floats.length > 2) {
		y = floats[2]
	}
	latestMatrix = getMultiplied2DMatrix(latestMatrix, [1.0, 0.0, 0.0, 1.0, -x, -y])
	return getMultiplied2DMatrix([1.0, 0.0, 0.0, 1.0, x, y], latestMatrix)
}

function get2DTransformByScale(floats) {
	var latestMatrix = get2DUnitMatrix()
	if (floats.length == 0) {
		return latestMatrix
	}
	latestMatrix[0] = floats[0]
	if (floats.length > 1) {
		latestMatrix[3] = floats[1]
	}
	else {
		latestMatrix[3] = latestMatrix[0]
	}
	return latestMatrix
}

function get2DTransformBySegment(beginPoint, endPoint) {
	var latestMatrix = get2DUnitMatrix()
//	a c e		0 2 4
//	b d f		1 3 5
	latestMatrix[4] = beginPoint[0]
	latestMatrix[5] = beginPoint[1]
	var subtraction = getXYSubtraction(endPoint, beginPoint)
	latestMatrix[0] = subtraction[0]
	latestMatrix[1] = subtraction[1]
	latestMatrix[2] = -latestMatrix[1]
	latestMatrix[3] = latestMatrix[0]
	return latestMatrix
}

function get2DTransformBySkewX(floats) {
	if (floats.length == 0) {
		return get2DUnitMatrix()
	}
	var rotation = floats[0] * gRadiansPerDegree
//	a c e		0 2 4
//	b d f		1 3 5
//	0 0 1		    +
//
//	1 tan
//	0 1
	return [1.0, 0.0, Math.tan(rotation), 1.0, 0.0, 0.0]
}

function get2DTransformBySkewY(floats) {
	if (floats.length == 0) {
		return get2DUnitMatrix()
	}
	var rotation = floats[0] * gRadiansPerDegree
//	a c e		0 2 4
//	b d f		1 3 5
//	0 0 1		    +
//
//	1 0
//	tan 1
	return [1.0, Math.tan(rotation), 0.0, 1.0, 0.0, 0.0]
}

function get2DTransformByTranslate(floats) {
	var latestMatrix = get2DUnitMatrix()
	if (floats.length == 0) {
		return latestMatrix
	}
	latestMatrix[4] = floats[0]
	if (floats.length > 1) {
		latestMatrix[5] = floats[1]
	}
	return latestMatrix
}

function get2DUnitMatrix() {
//	a c e		0 2 4
//	b d f		1 3 5
//	0 0 1		    +
//
//	1 0 0
//	0 1 0
	return [1.0, 0.0, 0.0, 1.0, 0.0, 0.0]
}

function get3DInverseRotation(originalMatrix) {
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	var determinant = 0.0
	var inverseMatrix = get3DUnitMatrix()
	for (var columnIndex = 0; columnIndex < 3; columnIndex++) {
		for (var rowIndex = 0; rowIndex < 3; rowIndex++) {
			var elementIndex = 4 * columnIndex + rowIndex
			var columnBegin = 0 + (columnIndex == 0)
			var columnEnd = 2 - (columnIndex == 2)
			var rowBegin = 0 + (rowIndex == 0)
			var rowEnd = 2 - (rowIndex == 2)
			var quadrupleBegin = 4 * columnBegin
			var quadrupleEnd = 4 * columnEnd
			inverseMatrix[elementIndex] = originalMatrix[quadrupleBegin + rowBegin] * originalMatrix[quadrupleEnd + rowEnd]
			inverseMatrix[elementIndex] -= originalMatrix[quadrupleEnd + rowBegin] * originalMatrix[quadrupleBegin + rowEnd]
			if ((columnIndex + rowIndex) % 2 == 1) {
				inverseMatrix[elementIndex] = -inverseMatrix[elementIndex]
			}
		}
	}
	for (var rowIndex = 0; rowIndex < 3; rowIndex++) {
		determinant += inverseMatrix[rowIndex] * originalMatrix[rowIndex]
	}
//	using 1.0 / determinant gives approximate matrix but exact point when inverted
	determinant = 1.0 / determinant
	for (var columnIndex = 0; columnIndex < 3; columnIndex++) {
		for (var rowIndex = 0; rowIndex < 3; rowIndex++) {
			inverseMatrix[4 * columnIndex + rowIndex] *= determinant
		}
	}
	for (var step = 1; step < 4; step++) {
		var columnOriginal = step
		var rowOriginal = 0
		if (step == 3) {
			columnOriginal = 2
			rowOriginal = 1
		}
		var originalIndex = 4 * columnOriginal + rowOriginal
		var originalValue = inverseMatrix[originalIndex]
		var swapIndex = 4 * rowOriginal + columnOriginal
		inverseMatrix[originalIndex] = inverseMatrix[swapIndex]
		inverseMatrix[swapIndex] = originalValue
	}
	return inverseMatrix
}

function get3DMatrixRotatedByXY(xyRotator) {
	var latestMatrix = get3DUnitMatrix()
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	cos		-sin	0 
//	sin		cos		0	
//	0		0		1	
	latestMatrix[0] = xyRotator[0]
	latestMatrix[1] = xyRotator[1]
	latestMatrix[4] = -xyRotator[1]
	latestMatrix[5] = xyRotator[0]
	return latestMatrix
}

function get3DTransformByBasis(floats) {
	var latestMatrix = get3DUnitMatrix()
	if (floats.length < 3) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	1 0 0 0		X	origin[0]
//	0 1 0 0		Y	origin[1]
//	0 0 1 0		XxY	origin[2]
//	0 0 0 1
//
	latestMatrix[0] = floats[0]
	latestMatrix[1] = floats[1]
	latestMatrix[2] = floats[2]
	if (floats.length < 6) {
		return latestMatrix
	}
	latestMatrix[4] = floats[3]
	latestMatrix[5] = floats[4]
	latestMatrix[6] = floats[5]
	var xyz = getCrossProduct(floats, floats.slice(3,6))
	latestMatrix[8] = xyz[0]
	latestMatrix[9] = xyz[1]
	latestMatrix[10] = xyz[2]
	if (floats.length < 9) {
		return latestMatrix
	}
	latestMatrix[12] = floats[6]
	latestMatrix[13] = floats[7]
	latestMatrix[14] = floats[8]
	return latestMatrix
}

function get3DTransformByPerspective(floats) {
	var latestMatrix = get3DUnitMatrix()
	if (floats.length == 0) {
		return latestMatrix
	}
	var z = floats[0]
	if (z == 0.0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	1 0 0     0
//	0 1 0     0
//	0 0 1     0
//	0 0 -1/z  1
//
	latestMatrix[11] = -1.0 / z
	return latestMatrix
}

function get3DTransformByRotate3D(floats) {
	var latestMatrix = get3DUnitMatrix()
	if (floats.length < 4) {
		return latestMatrix
	}
	var x = floats[0]
	var y = floats[1]
	var z = floats[2]
	var rotation = floats[3] * gRadiansPerDegree
	var cosAngle = Math.cos(rotation)
	var sinAngle = Math.sin(rotation)
	var t = 1.0 - cosAngle
	var xs = x * sinAngle
	var xt = x * t
	var ys = y * sinAngle
	var yt = y * t
	var zs = z * sinAngle
	var zt = z * t
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	This could be wrong direction, has not been tested.
//	https://en.wikipedia.org/wiki/Transformation_matrix#Rotation_2
//	c = cos		s = sin		t = 1 - cos
//
//	xtx + c		ytx - zs	ztx + ys
//	xty + zs	yty + c		zty - xs
//	xtz - ys	ytz + xs	ztz + c
//
	latestMatrix[0] = xt * x + cosAngle
	latestMatrix[1] = xt * y + zs
	latestMatrix[2] = xt * z - ys
	latestMatrix[4] = yt * x - zs
	latestMatrix[5] = yt * y + cosAngle
	latestMatrix[6] = yt * z + xs
	latestMatrix[8] = zt * x + ys
	latestMatrix[9] = zt * y - xs
	latestMatrix[10] = zt * z + cosAngle
	return latestMatrix
}

function get3DTransformByRotateX(floats) {
	var latestMatrix = get3DUnitMatrix()
	if (floats.length == 0) {
		return latestMatrix
	}
	rotation = floats[0] * gRadiansPerDegree
	cosAngle = Math.cos(rotation)
	sinAngle = Math.sin(rotation)
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	This could be wrong direction, has not been tested.
//	1	0		0 
//	0	cos		-sin
//	0	sin		cos
	latestMatrix[5] = cosAngle
	latestMatrix[6] = -sinAngle
	latestMatrix[9] = sinAngle
	latestMatrix[10] = cosAngle
	return latestMatrix
}

function get3DTransformByRotateY(floats) {
	var latestMatrix = get3DUnitMatrix()
	if (floats.length == 0) {
		return latestMatrix
	}
	rotation = floats[0] * gRadiansPerDegree
	cosAngle = Math.cos(rotation)
	sinAngle = Math.sin(rotation)
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	This could be wrong direction, has not been tested.
//	cos		0	sin
//	0		1	0
//	-sin	0	cos
	latestMatrix[0] = cosAngle
	latestMatrix[2] = -sinAngle
	latestMatrix[8] = sinAngle
	latestMatrix[10] = cosAngle
	return latestMatrix
}

function get3DTransformByRotateZ(floats) {
	var latestMatrix = get3DUnitMatrix()
	if (floats.length == 0) {
		return latestMatrix
	}
	rotation = floats[0] * gRadiansPerDegree
	cosAngle = Math.cos(rotation)
	sinAngle = Math.sin(rotation)
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	This could be wrong direction, has not been tested.
//	cos		-sin	0 
//	sin		cos		0	
//	0		0		1	
	latestMatrix[0] = cosAngle
	latestMatrix[1] = -sinAngle
	latestMatrix[4] = sinAngle
	latestMatrix[5] = cosAngle
	return latestMatrix
}

function get3DTransformByScale3D(floats) {
	var latestMatrix = get3DUnitMatrix()
	if (floats.length == 0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	latestMatrix[0] = floats[0]
	latestMatrix[5] = latestMatrix[0]
	if (floats.length > 1) {
		latestMatrix[5] = floats[1]
	}
	latestMatrix[10] = latestMatrix[5]
	if (floats.length > 2) {
		latestMatrix[10] = floats[2]
	}
	return latestMatrix
}

function get3DTransformByScaleX(floats) {
	var latestMatrix = get3DUnitMatrix()
	if (floats.length == 0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	latestMatrix[0] = floats[0]
	return latestMatrix
}

function get3DTransformByScaleY(floats) {
	var latestMatrix = get3DUnitMatrix()
	if (floats.length == 0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	latestMatrix[5] = floats[0]
	return latestMatrix
}

function get3DTransformByScaleZ(floats) {
	var latestMatrix = get3DUnitMatrix()
	if (floats.length == 0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	latestMatrix[10] = floats[0]
	return latestMatrix
}

function get3DTransformByTranslate3D(floats) {
	var latestMatrix = get3DUnitMatrix()
	if (floats.length == 0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	latestMatrix[12] = floats[0]
	if (floats.length > 1) {
		latestMatrix[13] = floats[1]
		if (floats.length > 2) {
			latestMatrix[14] = floats[2]
		}
	}
	return latestMatrix
}

function get3DTransformByTranslateX(floats) {
	var latestMatrix = get3DUnitMatrix()
	if (floats.length == 0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	latestMatrix[12] = floats[0]
	return latestMatrix
}

function get3DTransformByTranslateY(floats) {
	var latestMatrix = get3DUnitMatrix()
	if (floats.length == 0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	latestMatrix[13] = floats[0]
	return latestMatrix
}

function get3DTransformByTranslateZ(floats) {
	var latestMatrix = get3DUnitMatrix()
	if (floats.length == 0) {
		return latestMatrix
	}
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	latestMatrix[14] = floats[0]
	return latestMatrix
}

function get3DUnitMatrix() {
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	1 0 0 0
//	0 1 0 0
//	0 0 1 0
//	0 0 0 1
	return [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0]
}

function getArrayDistanceSquared(arrayA, arrayB) {
	var distanceSquared = 0.0
	for (var arrayIndex = 0; arrayIndex < arrayA.length; arrayIndex++) {
		var delta = arrayA[arrayIndex] - arrayB[arrayIndex]
		distanceSquared += delta * delta
	}
	return distanceSquared
}

function getArrayMultiplicationByScalar(elements, scalarMultiplier) {
	var arrayMultiplication = new Array(elements.length)
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		arrayMultiplication[elementIndex] = elements[elementIndex] * scalarMultiplier
	}
	return arrayMultiplication
}

function getArraysMultiplicationByScalar(elementLists, scalarMultiplier) {
	var arraysMultiplication = new Array(elementLists.length)
	for (var elementListIndex = 0; elementListIndex < elementLists.length; elementListIndex++) {
		arraysMultiplication[elementListIndex] = getArrayMultiplicationByScalar(elementLists[elementListIndex], scalarMultiplier)
	}
	return arraysMultiplication
}

function getBrightness256(brightness) {
	return Math.floor(255.0 * ((brightness) % 1.0))
}

//cross(A, B) = [ a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1 ]
function getCrossProduct(a, b) {
	return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

//cross(A, B) = [ a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1 ]
function getCrossProductZ(a, b) {
	return a[0] * b[1] - a[1] * b[0]
}

function getMultiplied2DMatrix(matrixA, matrixB) {
//	a c e		0 2 4
//	b d f		1 3 5
//	0 0 1		    +
//
//	row by column into row, colum
//	[0 2 4] x [0 1  ] = '0,0 2,1' > a > 0
//	[1 3 5] x [0 1  ] = '1,0 3,1' > b > 1
//	[0 2 4] x [2 3  ] = '0,2 2,3' > c > 2
//	[1 3 5] x [2 3  ] = '1,2 3,3' > d > 3
//	[0 2 4] x [4 5 +] = '0,4 2,5 4,' > e > 4
//	[1 3 5] x [4 5 +] = '1,4 3,5 5,' > f > 5
	var a = matrixA[0] * matrixB[0] + matrixA[2] * matrixB[1]
	var b = matrixA[1] * matrixB[0] + matrixA[3] * matrixB[1]
	var c = matrixA[0] * matrixB[2] + matrixA[2] * matrixB[3]
	var d = matrixA[1] * matrixB[2] + matrixA[3] * matrixB[3]
	var e = matrixA[0] * matrixB[4] + matrixA[2] * matrixB[5] + matrixA[4]
	var f = matrixA[1] * matrixB[4] + matrixA[3] * matrixB[5] + matrixA[5]
	return [a, b, c, d, e, f]
}

function getMultiplied3DMatrix(mA, mB) {
	var multiplied3D = get3DUnitMatrix()
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
//
//	row by column into row, colum
//	[0 4 8 12] x [0 1 2 3] = '0,0 4,1 8,2 12,3' > 0
//	[1 5 9 13] x [0 1 2 3] = '1,0 5,1 9,2 13,3' > 1
//	[2 6 10 14] x [0 1 2 3] = '2,0 6,1 10,2 14,3' > 2
//	[3 7 11 15] x [0 1 2 3] = '3,0 7,1 11,2 15,3' > 3
//	[0 4 8 12] x [4 5 6 7] = '0,4 4,5 8,6 12,7' > 4
	for (columnIndex = 0; columnIndex < 16; columnIndex += 4) {
		for (rowIndex = 0; rowIndex < 4; rowIndex++) {
			var element = mA[rowIndex] * mB[columnIndex]
			element += mA[rowIndex + 4] * mB[columnIndex + 1]
			element += mA[rowIndex + 8] * mB[columnIndex + 2]
			element += mA[rowIndex + 12] * mB[columnIndex + 3]
			multiplied3D[columnIndex + rowIndex] = element
		}
	}
	return multiplied3D
}

function getNewlineMatrixString(matrix, numberOfRows) {
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	var rowStrings = []
	for (rowIndex = 0; rowIndex < numberOfRows; rowIndex++) {
		var columnStrings = []
		for (columnIndex = 0; columnIndex < matrix.length; columnIndex += numberOfRows) {
			columnStrings.push(matrix[columnIndex + rowIndex].toFixed(3))
		}
		rowStrings.push(columnStrings.join(','))
	}
	return rowStrings.join('\n')
}

function getRGB() {
	gRGBIndex += 1
	return getRGBByIndex(gRGBIndex)
}

function getRGBByIndex(rgbIndex) {
	return [getBrightness256(rgbIndex * 0.617), getBrightness256(rgbIndex * 0.733), getBrightness256(rgbIndex * 0.317)]
}

function getTransformedPolygons(polygon, transform2Ds) {
	if (transform2Ds == null) {
		return [polygon]
	}
	var transformedPolygons = []
	for (var transform2D of transform2Ds) {
		transformedPolygons.push(transform2DPoints(getArraysCopy(polygon), transform2D))
	}
	return transformedPolygons
}

function getXYAddition(xyA, xyB) {
	return [xyA[0] + xyB[0], xyA[1] + xyB[1]]
}

function getXYByPortion(portionA, xyA, xyB) {
	var portionB = 1.0 - portionA
	return [portionA * xyA[0] + portionB * xyB[0], portionA * xyA[1] + portionB * xyB[1]]
}

function getXYBy3DMatrix(point, matrix) {
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	var x = point[0] * matrix[0] + point[1] * matrix[4] + point[2] * matrix[8] + matrix[12]
	var y = point[0] * matrix[1] + point[1] * matrix[5] + point[2] * matrix[9] + matrix[13]
	return [x, y]
}

function getXYDistance(xyA, xyB) {
	return Math.sqrt(getXYDistanceSquared(xyA, xyB))
}

function getXYDistanceSquared(xyA, xyB) {
	return getXYLengthSquared(getXYSubtraction(xyA, xyB))
}

function getXYDotProduct(xyA, xyB) {
	return xyA[0] * xyB[0] + xyA[1] * xyB[1]
}

function getXYLength(xy) {
	return Math.sqrt(getXYLengthSquared(xy))
}

function getXYLengthSquared(xy) {
	return xy[0] * xy[0] + xy[1] * xy[1]
}

function getXYMultiplication(xyA, xyB) {
	return [xyA[0] * xyB[0], xyA[1] * xyB[1]]
}

function getXYMultiplicationByScalar(xyA, scalarMultiplier) {
	return [xyA[0] * scalarMultiplier, xyA[1] * scalarMultiplier]
}

function getXYPolar(angle, radius) {
	return [radius * Math.cos(angle), radius * Math.sin(angle)]
}

function getXYRotation(xy, xyRotator) {
	return [xy[0] * xyRotator[0] - xy[1] * xyRotator[1], xy[0] * xyRotator[1] + xy[1] * xyRotator[0]]
}

function getXYRotations(xys, xyRotator) {
	var xyRotations = new Array(xys.length)
	for (var xyIndex = 0; xyIndex < xys.length; xyIndex++) {
		xyRotations[xyIndex] = getXYRotation(xys[xyIndex], xyRotator)
	}
	return xyRotations
}

function getXYSubtraction(xyA, xyB) {
	return [xyA[0] - xyB[0], xyA[1] - xyB[1]]
}

function getXYZAddition(xyzA, xyzB) {
	return [xyzA[0] + xyzB[0], xyzA[1] + xyzB[1], xyzA[2] + xyzB[2]];
}

function getXYZBy3DMatrix(matrix, point) {
//	0 4 8  12
//	1 5 9  13
//	2 6 10 14
//	3 7 11 15
	var x = point[0] * matrix[0] + point[1] * matrix[4] + point[2] * matrix[8] + matrix[12]
	var y = point[0] * matrix[1] + point[1] * matrix[5] + point[2] * matrix[9] + matrix[13]
	var z = point[0] * matrix[2] + point[1] * matrix[6] + point[2] * matrix[10] + matrix[14]
	return [x, y, z]
}

function getXYZByKey(key) {
	parameters = key.split(',')
	return [parseFloat(parameters[0]), parseFloat(parameters[1]), parseFloat(parameters[2])]
}

function getXYZDistanceSquared(xyA, xyB) {
	return getXYZLengthSquared(getXYZSubtraction(xyA, xyB))
}

function getXYZDotProduct(xyzA, xyzB) {
	return xyzA[0] * xyzB[0] + xyzA[1] * xyzB[1] + xyzA[2] * xyzB[2]
}

function getXYZLength(xyz) {
	return Math.sqrt(getXYZLengthSquared(xyz))
}

function getXYZLengthSquared(xyz) {
	return xyz[0] * xyz[0] + xyz[1] * xyz[1] + xyz[2] * xyz[2]
}

function getXYZMultiplication(xyzA, xyzB) {
	return [xyzA[0] * xyzB[0], xyzA[1] * xyzB[1], xyzA[2] * xyzB[2]]
}

function getXYZMultiplicationByScalar(xyzA, scalarMultiplier) {
	return [xyzA[0] * scalarMultiplier, xyzA[1] * scalarMultiplier, xyzA[2] * scalarMultiplier]
}

function getXYZsBy3DMatrix(matrix, points) {
	var xyzs = new Array(points.length)
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		xyzs[pointIndex] = getXYZBy3DMatrix(matrix, points[pointIndex])
	}
	return xyzs
}

function getXYZSubtraction(xyzA, xyzB) {
	return [xyzA[0] - xyzB[0], xyzA[1] - xyzB[1], xyzA[2] - xyzB[2]];
}

function invertXYZ(xyz) {
	xyz[0] = -xyz[0]
	xyz[1] = -xyz[1]
	xyz[2] = -xyz[2]
	return xyz
}

function multiplyArrayByScalar(elements, scalarMultiplier) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		elements[elementIndex] *= scalarMultiplier
	}
	return elements
}

function multiplyXYArraysByScalar(xyArrays, multiplier) {
	for (var xys of xyArrays) {
		multiplyXYsByScalar(xys, multiplier)
	}
	return xyArrays
}

function multiplyXYByScalar(xy, scalarMultiplier) {
	xy[0] *= scalarMultiplier
	xy[1] *= scalarMultiplier
	return xy
}

function multiplyXYsByScalar(xys, multiplier) {
	for (var xy of xys) {
		xy[0] *= multiplier
		xy[1] *= multiplier
	}
	return xys
}

function multiplyXYZ(xyz, xyzMultiplier) {
	xyz[0] *= xyzMultiplier[0]
	xyz[1] *= xyzMultiplier[1]
	xyz[2] *= xyzMultiplier[2]
	return xyz
}

function multiplyXYZArraysByScalar(xyzArrays, multiplier) {
	for (var xyzs of xyzArrays) {
		multiplyXYZsByScalar(xyzs, multiplier)
	}
	return xyzArrays
}

function multiplyXYZByScalar(xyz, scalarMultiplier) {
	xyz[0] *= scalarMultiplier
	xyz[1] *= scalarMultiplier
	xyz[2] *= scalarMultiplier
	return xyz
}

function multiplyXYZsByScalar(xyzs, multiplier) {
	for (var xyz of xyzs) {
		xyz[0] *= multiplier
		xyz[1] *= multiplier
		xyz[2] *= multiplier
	}
	return xyzs
}

function normalizeXY(xy) {
	xyLength = getXYLength(xy)
	if (xyLength > 0.0) {
		divideXYByScalar(xy, xyLength)
	}
	return xy
}

function normalizeXYZ(xyz) {
	xyzLength = getXYZLength(xyz)
	if (xyzLength > 0.0) {
		divideXYZByScalar(xyz, xyzLength)
	}
	return xyz
}

function rotateXYZByBasis(rotationBasis, xyz, xyRotator) {
	var basis0 = rotationBasis[0]
	var basis1 = rotationBasis[1]
	var xyzBasis0 = xyz[basis0]
	xyz[basis0] = xyz[basis0] * xyRotator[0] - xyz[basis1] * xyRotator[1]
	xyz[basis1] = xyzBasis0 * xyRotator[1] + xyz[basis1] * xyRotator[0]
}

function rotateXYZsByBasis(rotationBasis, xyzs, xyRotator) {
	for (var xyz of xyzs) {
		rotateXYZByBasis(rotationBasis, xyz, xyRotator)
	}
}

function subtractXY(xyA, xyB) {
	xyA[0] -= xyB[0]
	xyA[1] -= xyB[1]
	return xyA
}

function subtractXYZ(xyzA, xyzB) {
	xyzA[0] -= xyzB[0]
	xyzA[1] -= xyzB[1]
	return xyzA
}

function transform2DPoint(point, matrix) {
	originalX = point[0]
//	a c e		0 2 4
//	b d f		1 3 5
	point[0] = point[0] * matrix[0] + point[1] * matrix[2] + matrix[4]
	point[1] = originalX * matrix[1] + point[1] * matrix[3] + matrix[5]
}

function transform2DPoints(points, matrix) {
	for (var point of points) {
		transform2DPoint(point, matrix)
	}
	return points
}

function widenBoundingBox(boundingBox, point) {
	for (var parameterIndex = 0; parameterIndex < point.length; parameterIndex++) {
		boundingBox[0][parameterIndex] = Math.min(boundingBox[0][parameterIndex], point[parameterIndex])
		boundingBox[1][parameterIndex] = Math.max(boundingBox[1][parameterIndex], point[parameterIndex])
	}
}

var g2DTransformMap = new Map([
	['matrix', get2DTransformByMatrix],
	['rotate', get2DTransformByRotate],
	['scale', get2DTransformByScale],
	['skewX', get2DTransformBySkewX],
	['skewY', get2DTransformBySkewY],
	['translate', get2DTransformByTranslate]])
var g3DTransformMap = new Map([
	['basis', get3DTransformByBasis],
	['matrix3D', get2DTransformByMatrix],
	['perspective', get3DTransformByPerspective],
	['rotate3D', get3DTransformByRotate3D],
	['rotateX', get3DTransformByRotateX],
	['rotateY', get3DTransformByRotateY],
	['rotateZ', get3DTransformByRotateZ],
	['scale3D', get3DTransformByScale3D],
	['scaleX', get3DTransformByScaleX],
	['scaleY', get3DTransformByScaleY],
	['scaleZ', get3DTransformByScaleZ],
	['translate3D', get3DTransformByTranslate3D],
	['translateX', get3DTransformByTranslateX],
	['translateY', get3DTransformByTranslateY],
	['translateZ', get3DTransformByTranslateZ]])
