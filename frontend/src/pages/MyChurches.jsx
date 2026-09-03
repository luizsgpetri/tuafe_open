import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { clearToken, fetchMyChurches } from '../api.js';

const MyChurches = () => {
  const [churches, setChurches] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyChurches()
      .then(({ data }) => setChurches(data))
      .catch((err) => {
        // An expired or revoked token should send the visitor back to login.
        if (err.message.toLowerCase().includes('forbidden')) {
          clearToken();
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Spinner animation="border" />;
  }

  return (
    <>
      <h1 className="h4 mb-4">My churches</h1>

      {error && <Alert variant="danger">{error}</Alert>}

      {!error && churches.length === 0 && (
        <Alert variant="light">You are not part of any church yet.</Alert>
      )}

      <Row className="g-3">
        {churches.map((church) => (
          <Col md={6} key={church.documentId}>
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <Card.Title className="h5">{church.name}</Card.Title>
                  <Badge bg={church.isAdmin ? 'primary' : 'secondary'}>
                    {church.isAdmin ? 'Admin' : 'Member'}
                  </Badge>
                </div>
                <Card.Text className="text-muted">{church.description}</Card.Text>
                <div className="d-flex gap-2">
                  <Button as={Link} to={`/church/${church.inviteToken}`} variant="outline-primary" size="sm">
                    Profile
                  </Button>
                  {church.isAdmin && (
                    <Button as={Link} to={`/qr/${church.inviteToken}`} variant="primary" size="sm">
                      Invitation QR code
                    </Button>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
};

export default MyChurches;
