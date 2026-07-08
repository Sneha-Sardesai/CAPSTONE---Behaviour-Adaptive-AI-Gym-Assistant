import math

def calculate_angle(a, b, c):
    """
    Calculate angle at point b formed by points a, b, c
    """
    a = [a['x'], a['y']]
    b = [b['x'], b['y']]
    c = [c['x'], c['y']]

    angle = math.degrees(
        math.atan2(c[1]-b[1], c[0]-b[0]) -
        math.atan2(a[1]-b[1], a[0]-b[0])
    )

    angle = abs(angle)

    if angle > 180:
        angle = 360 - angle

    return angle

def distance(a, b):
    return math.sqrt((a['x'] - b['x'])**2 + (a['y'] - b['y'])**2)

def calculateAngles(landmarks):
    """
    Calculate key angles for form analysis
    """
    angles = {}
    
    # Knee angles
    if 'left_hip' in landmarks and 'left_knee' in landmarks and 'left_ankle' in landmarks:
        angles['left_knee'] = calculate_angle(landmarks['left_hip'], landmarks['left_knee'], landmarks['left_ankle'])
    if 'right_hip' in landmarks and 'right_knee' in landmarks and 'right_ankle' in landmarks:
        angles['right_knee'] = calculate_angle(landmarks['right_hip'], landmarks['right_knee'], landmarks['right_ankle'])
    
    # Hip angles
    if 'left_shoulder' in landmarks and 'left_hip' in landmarks and 'left_knee' in landmarks:
        angles['left_hip'] = calculate_angle(landmarks['left_shoulder'], landmarks['left_hip'], landmarks['left_knee'])
    if 'right_shoulder' in landmarks and 'right_hip' in landmarks and 'right_knee' in landmarks:
        angles['right_hip'] = calculate_angle(landmarks['right_shoulder'], landmarks['right_hip'], landmarks['right_knee'])
    
    return angles

def detectFormErrors(exercise_name, angles, landmarks):
    """
    Detect form errors based on exercise type
    """
    errors = []
    
    if exercise_name.lower() == 'squats':
        # Check knee angles
        avg_knee_angle = (angles.get('left_knee', 0) + angles.get('right_knee', 0)) / 2
        
        if avg_knee_angle < 50:
            errors.append({
                'type': 'too_low',
                'severity': 'medium',
                'body_part': 'knees',
                'description': 'Squat too low - may strain knees'
            })
        
        # Check hip angles
        avg_hip_angle = (angles.get('left_hip', 0) + angles.get('right_hip', 0)) / 2
        
        if avg_hip_angle < 50:
            errors.append({
                'type': 'back_rounding',
                'severity': 'high',
                'body_part': 'back',
                'description': 'Back rounding detected - keep back straight'
            })
        
        # Check feet distance
        if 'left_ankle' in landmarks and 'right_ankle' in landmarks and 'left_shoulder' in landmarks and 'right_shoulder' in landmarks:
            feet_dist = distance(landmarks['left_ankle'], landmarks['right_ankle'])
            shoulder_dist = distance(landmarks['left_shoulder'], landmarks['right_shoulder'])
            
            if feet_dist < shoulder_dist * 0.4:
                errors.append({
                    'type': 'feet_too_close',
                    'severity': 'medium',
                    'body_part': 'feet',
                    'description': 'Feet too close together - spread legs wider'
                })
        
        # Check knee alignment
        if abs(angles.get('left_knee', 0) - angles.get('right_knee', 0)) > 60:
            errors.append({
                'type': 'uneven_knees',
                'severity': 'high',
                'body_part': 'knees',
                'description': 'Knees uneven - bend both knees equally'
            })
    
    return errors
