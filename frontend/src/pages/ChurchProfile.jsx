import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, ListGroup, Row, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { fetchInvite } from '../api.js';

/**
 * Public profile of a church, addressed by its invitation token so it can be
 * opened straight from a QR code or from the member list.
 */
const ChurchProfile = () => {
  const { token } = useParams();
  const [church, setChurch] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvite(token)
      .then(({ data }) => setChurch(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <Spinner animation="border" />;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <Row className="justify-content-center">
      <Col lg={8}>
        <Card className="shadow-sm">
          <Card.Body className="p-4">
            <h1 className="h3">{church.name}</h1>
            <p className="text-muted">{church.description}</p>

            <ListGroup variant="flush" className="mb-4">
              {church.address && (
                <ListGroup.Item>
                  <strong>Address</strong>
                  <div className="text-muted">{church.address}</div>
                </ListGroup.Item>
              )}
              {church.email && (
                <ListGroup.Item>
                  <strong>Email</strong>
                  <div className="text-muted">{church.email}</div>
                </ListGroup.Item>
              )}
              {church.phone && (
                <ListGroup.Item>
                  <strong>Phone</strong>
                  <div className="text-muted">{church.phone}</div>
                </ListGroup.Item>
              )}
              <ListGroup.Item>
                <strong>Members</strong>
                <div className="text-muted">{church.memberCount}</div>
              </ListGroup.Item>
            </ListGroup>

            <div className="d-flex gap-2">
              <Button as={Link} to={`/qr/${token}`} variant="primary">
                Invitation QR code
              </Button>
              <Button as={Link} to={`/join/${token}`} variant="outline-secondary">
                Join this church
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default ChurchProfile;
